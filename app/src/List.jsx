import React, { Component } from 'react';
import { get } from './api';
import './List.css';

const wikiPath = "https://en.wikipedia.org";

export default class List extends Component {
  state = {
    isLoading: false,
    error: null,
    list: [],
    query: ""
  }

  componentDidMount() {
    this.getList("");
  }

  onSearch(e) {
    this.getList(e.target.value);
  }

  getList(query) {
    this.setState({error: null, isLoading: true});

    get("wiki?query=" + query, this.props.token, (data, message) => {
      if(data) {
        this.setState({list: data, isLoading: false});
      } else {
        this.setState({list: [], error: message, isLoading: false});
      }
    });
  }

  render() {
    return (
      <div className="ListWrapper">
        <h1>Search Engine</h1>
        <input className="Search" type="text" placeholder="Search..." onChange={(e) => {this.onSearch(e)}} />
        {this.state.error && <div className="Error">{this.state.error}</div>}
        <div className="List">
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th className="Right">Score</th>
                <th className="Right">Content</th>
                <th className="Right">Location</th>
              </tr>
            </thead>
            <tbody>
            { this.state.list.map((item, i) => (
              <tr key={i} className="Row">
                <td><a target="_blank" rel="noopener noreferrer" href={wikiPath + item.url}>{item.url}</a></td>
                <td className="Right" title={item.score}>{item.score}</td>
                <td className="Right" title={item.frequencyScore}>{item.frequencyScore}</td>
                <td className="Right" title={item.locationScore}>{item.locationScore}</td>
              </tr>
            ))}
            </tbody>
          </table>
          {this.state.isLoading && <div className="Loading">Loading...</div>}
        </div>
      </div>
    );
  }
}
