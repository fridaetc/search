import React, { Component } from 'react';
import { withCookies } from 'react-cookie';
import { get, post } from './api';
import List from './List';
import './App.css';

export default withCookies(class App extends Component {
  state = {
    isLoading: true,
    user: null,
    error: null
  }

  componentDidMount() {
    let token = this.props.cookies.get("token");
    if(token) {
      get("user", token, (data, message) => {
        if(data) {
          this.setState({user: {token, ...data}, error: null, isLoading: false});
        } else {
          this.setState({error: message, user: null, isLoading: false});
        }
       });
    } else {
      this.setState({isLoading: false});
    }
  }

  login(e) {
    e.preventDefault();
    let username = e.target.username.value,
        pw = e.target.password.value;

    post("login", {username, pw}, (data, message) => {
      if(data) {
        this.setState({user: data, error: null});
        this.props.cookies.set("token", data.token, {path: '/'});
      } else {
        this.setState({error: message, user: null});
      }
     });
  }

  logout() {
    this.props.cookies.remove("token");
    this.setState({error: null, user: null});
  }

  render() {
    let {user} = this.state;
    return (
      <div className="App">
        <div className="Login">
          {this.state.error && <div className="Error">{this.state.error}</div>}
          {this.state.isLoading && <div className="Loading">...</div>}
          {!user && !this.state.isLoading &&
            <form onSubmit={(e) => this.login(e)}>
            <input id="username" type="text" placeholder="Username" />
            <input id="password" type="password" placeholder="Password" />
            <input type="submit" value="Login" />
            </form>
          }
          {user && !this.state.isLoading &&
            <div className="Loggedin">
              <div className="Header">
                <h4 className="Welcome">Welcome {user.userName}</h4>
                <span onClick={(e) => this.logout()}>Logout</span>
              </div>
              <List token={user.token} />
            </div>
          }
        </div>
      </div>
    );
  }
})
