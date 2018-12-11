const fs = require('fs');
const readline = require('readline');
const stream = require('stream');
//const db = require('./db/db_wiki');

const MongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb://127.0.0.1:27017/local?keepAlive=true&autoReconnect=true&socketTimeoutMS=36000000&connectTimeoutMS=36000000";
const client = new MongoClient(mongoUrl);
const dbName = "local";

const WORDS_PATH = "db/Words/";

/*
* Query
* Order by: word frequency, document location, (pagerank)
*/
exports.query = function(query, cb) {
  let words = query.trim().split(" ");
  let wordsIds = [];

  words.forEach(word => {
    let obj = db.getWordToIdByWord(word);
    if(obj && !~wordsIds.indexOf(obj.id)) {
      wordsIds.push(obj.id);
    }
  });

  let pages = db.getPagesByWordIds(wordsIds);
  let min = Infinity, max = -Infinity;

  //frequency and location score
  pages.forEach((page, i) => {
    let scoreFrequency = 0, scoreLocation = 0;
    page.words.forEach((pageWord, wordIndex) => {
      if(~wordsIds.indexOf(pageWord)) {
        scoreLocation += (wordIndex+1);
        scoreFrequency++;
      } else {
        scoreLocation += 100000;
      }
    });

    if(scoreFrequency > max) {
      max = scoreFrequency;
    }
    if(scoreLocation < min) {
      min = scoreLocation;
    }

    page.frequencyScore = scoreFrequency;
    page.locationScore = scoreLocation;
  });

  //normalize
  for (let i = 0; i < pages.length; i++) {
    pages[i].frequencyScore = pages[i].frequencyScore / max;
    pages[i].locationScore = min / Math.max(pages[i].locationScore, 0.00001);
    pages[i].score = pages[i].frequencyScore + 0.8 * pages[i].locationScore;
    delete pages[i].words;
  }

  pages.sort(function(a, b){return b.score - a.score});
  cb(pages.slice(0, 5));
}

/*
* Indexing
*/
exports.generateIndex = function(cb) {
  let startTime = new Date();

  client.connect((err) => {
    const db = client.db(dbName);
    db.dropCollection("pages", {}, function() {
      db.dropCollection("words", {}, function() {
        db.createCollection("pages", function() {
          db.createCollection("words", function() {
            console.log("Collections created!");

            const dbWords = db.collection('words');
            const dbPages = db.collection('pages');

            let pagesAdded = 0, noOfFiles = 0, dirsAdded = 1;
            let pages = [];
            let wordsBulkQueries = [];

            //Read all files (assuming only one level nested folders)
            fs.readdir(WORDS_PATH, (err, dirs) => {
              dirs.forEach((dir, i) => {
                dirsAdded++;
                let newPath = WORDS_PATH + "/" + dir;
                fs.stat(newPath, (err, stats) => {
                  if(stats.isDirectory()) {
                    fs.readdir(newPath, (err, files) => {
                      noOfFiles += files.length;
                      files.forEach((file, j) => {
                        addWordsFromFile(db, newPath + "/" + file, file, function({wordQueries, words}) {
                          pagesAdded++;

                          if(wordQueries) {
                            wordsBulkQueries = wordsBulkQueries.concat(wordQueries);
                          }

                          let url = "/wiki/" + file;
                          pages.push({url, words});

                          console.log("Added word query from file " + (j+1) + "/" + files.length + " from folder " + (i+1) + "/" + dirs.length + ", " + file);

                          if(pagesAdded >= noOfFiles && dirsAdded >= dirs.length) {
                            console.log("Start bulk write words: " + new Date());
                            dbWords.bulkWrite(wordsBulkQueries).then(res => {
                              console.log("All words added! " + new Date());

                              dbWords.find({}, {}).toArray((err, storedWords) => {
                                let pagesBulkQueries = pages.map((page, k) => {
                                  //map ids to each word
                                  let wordsIds = page.words.map(word => {
                                    return storedWords.find(storedWord => storedWord.word == word)._id;
                                  });

                                  console.log("Added page query from file " + (k+1) + "/" + pages.length + ", " + page.url);

                                  return {
                                    updateOne: {
                                      filter: {url: page.url},
                                      update: {$set: {url: page.url, words: wordsIds}},
                                      upsert: true
                                    }
                                  }
                                });

                                console.log("Start bulk write pages: " + new Date());
                                dbPages.bulkWrite(pagesBulkQueries).then(pagesResult => {
                                  client.close();

                                  console.log("All pages added!");
                                  console.log("Started: " + startTime);
                                  console.log("Ended: " + new Date());
                                  cb(null);
                                }).catch(err => {
                                  console.log(err);
                                  cb(null);
                                });
                              });
                            }).catch(err => {
                              console.log(err);
                              cb(null);
                            });
                          }
                        });
                      });
                    });
                  } else {
                    //pages outside category folders
                  }
                });
              });
            })
          });
        });
      });
    });
  });
}

function addWordsFromFile(db, filePath, fileName, cb) {
  //Read words
  let instream = fs.createReadStream(filePath);
  let outstream = new stream;
  let rl = readline.createInterface(instream, outstream);

  rl.on('line', function(line) {
    let words = line.trim().split(' ');

    cb({wordQueries: words.map((word) => {
      return {
        updateOne: {
          filter: {word},
          update: {$set: {word}},
          upsert: true
        }
      }
    }), words});
  });
}
