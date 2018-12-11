const fs = require('fs');

const WORDS_PATH = "db/Words/";

let dbPages = [],
dbWords = [];

/*
* Query
* Order by: word frequency, document location, (pagerank)
*/
exports.query = function(query, cb) {
  query = query.trim().toLowerCase();
  let words = query ? query.split(" ") : [];

  let wordsIds = [];
  words.forEach(word => {
    let obj = findWord(word);
    if(obj && !~wordsIds.indexOf(obj.id)) {
      wordsIds.push(obj.id);
    }
  });

  //Get pages which has any of the words in the query
  let pages = dbPages.filter(dbPage => {
    let found = false;
    if(dbPage.words) {
      for (let i = 0; i < wordsIds.length; i++) {
        if(~dbPage.words.indexOf(wordsIds[i])) {
          found = true;
          break;
        }
      }
    }
    return found;
  });

  let min = Infinity, max = -Infinity;

  //frequency and location score
  pages.forEach(page => {
    let scoreFrequency = 0, scoreLocation = 0;
    wordsIds.forEach(wordId => {
      let locationFound = false;
      page.words.forEach((pageWord, wordIndex) => {
        if(wordId == pageWord) {
          scoreFrequency++;

          //If first location of word
          if(!locationFound) {
            scoreLocation += (wordIndex + 1);
            locationFound = true;
          }
        }
      });

      //If word wasnt found at all
      if(!locationFound) {
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
    pages[i].locationScore = 0.8 * (min / Math.max(pages[i].locationScore, 0.00001));
    pages[i].score = pages[i].frequencyScore + pages[i].locationScore;
  }

  pages.sort(function(a, b){return b.score - a.score});
  cb(pages.slice(0, 5));
}

/*
* Indexing
*/
exports.generateIndex = function(cb) {
  let startTime = new Date();
  let pagesAdded = 0, noOfFiles = 0, dirsAdded = 1;

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
              addWordsAndPages(newPath + "/" + file, file, function(err) {
                pagesAdded++;
                if(err) { console.log(err); } else {
                  console.log("Added page from file " + (j+1) + "/" + files.length + " from folder " + (i+1) + "/" + dirs.length + ", " + file);
                }

                //If last file
                if(pagesAdded >= noOfFiles && dirsAdded >= dirs.length) {
                  console.log("Started: " + startTime);
                  console.log("Finished: " + new Date());
                  cb(null);
                }
              });
            });
          });
        } else {
          //pages outside category folders
        }
      });
    });
  });
}

function addWordsAndPages(filePath, fileName, cb) {
  let url = "/wiki/" + fileName;

  //Read words
  fs.readFile(filePath, 'utf8', function(err, data) {
    let words = data.trim().split(' ');
    let wordIds = new Array(words.length);

    words.forEach((word, i) => {
      wordIds[i] = getSetWordId(word);
    });

    setPage(url, wordIds);
    cb(null);
  });
}

function setPage(url, wordIds) {
  let pageObj = dbPages.find(dbPage => {return dbPage.url == url});
  if(pageObj) {
    //If page exists, update words
    pageObj.words = wordIds;
  } else {
    //If page doesnt exist, add page
    dbPages.push({url, words: wordIds});
  }
}

function getSetWordId(word) {
  let wordObj = findWord(word);
  if(wordObj) {
    //If word exists, return id
    return wordObj.id;
  } else {
    //If word doesnt exist, add word
    let newId = dbWords.length;
    dbWords.push({id: newId, word});
    return newId;
  }
}

function findWord(word) {
  return dbWords.find(dbWord => {return dbWord.word == word});
}
