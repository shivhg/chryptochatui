import React from 'react';
import './App.css';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Input from '@mui/material/Input';
import { Route, Routes, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Web3 from 'web3';

const client = new WebSocket("wss://" + "cryptop2pchat.herokuapp.com" + "/ws" + "?Authorization=" + localStorage.getItem('loggedInUserToken'));

function WithRedirect() {
  let navigate = useNavigate();

  return (<AppCopy navigate={navigate} id={1} />)
}

class AppCopy extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: {}, selected: '', me: '', newMessage: '', loginUser: '', loggedIn: false,
      web3Provider: '', newChat: '', navigate: props.navigate
    };
  }

  componentDidMount() {
    this.loggedIn()
  }

  loggedIn = () => {
    var user = localStorage.getItem('loggedInUser')
    var loggedInUserToken = localStorage.getItem('loggedInUserToken')

    if (user != null) {
      fetch("http://cryptop2pchat.herokuapp.com/messages", {
        method: 'get', headers: new Headers({
          'Authorization': loggedInUserToken,
        })
      })
        .then(async (res) => {
          if (res.status == 200) {
            var body = await res.json()
            this.setState({ messages: body, loggedIn: true, me: user })
            this.setUpWebsocket();
          }
          if (res.status == 401) {
            localStorage.clear('loggedInUser')
            localStorage.clear('loggedInUserToken')
            this.state.navigate("/login")
          }
        })
      return
    }
    this.state.navigate("/login", { state: { id: 7, color: 'green' } })
  }

  setUpWebsocket = () => {
    client.onopen = () => {
      console.log('WebSocket Client Connected');
    };
    client.onmessage = (evt) => {
      var messages = evt.data;
      var myobj = JSON.parse(messages);
      var newWalletSelect = '';
      var allMessages = { ...this.state.messages }
      if (myobj.From === this.state.me) {
        allMessages[myobj.To] == undefined ? allMessages[myobj.To] = [myobj] : allMessages[myobj.To] = [...allMessages[myobj.To], myobj]
        newWalletSelect = myobj.To
      } else {
        allMessages[myobj.From] == undefined ? allMessages[myobj.From] = [myobj] : allMessages[myobj.From] = [...allMessages[myobj.From], myobj]
        newWalletSelect = myobj.From
      }

      this.setState({ messages: allMessages, newMessage: '' })
      this.selectPerson(newWalletSelect)
    };
    client.onclose = (message) => {
      console.log(message);
    };
    client.onerror = (message) => {
      console.log(message);
    };
  }

  renderbase = () => {
    console.log(this.state)
    return Object.keys(this.state.messages).map((item, index) => {
      return (
        <div>
          <Box sx={{ padding: "10px" }}>
            <Button variant="outlined" onClick={() => this.selectPerson(item)}>{item}</Button>
          </Box>
        </div>
      )
    })
  }

  newChat = (event) => {
    event.preventDefault();
    var allMessages = { ...this.state.messages };
    allMessages[this.state.newChat] = []

    this.selectPerson(this.state.newChat)
    this.setState({ newChat: '', messages: allMessages })
  }

  selectPerson = (person) => {
    this.setState({ selected: person })
  }

  handleNewMessage = (event) => {
    this.setState({ newMessage: event.target.value })
  }

  handleSubmit = (event) => {
    event.preventDefault();
    var send = { To: this.state.selected, Text: this.state.newMessage }
    console.log(send)
    client.send(JSON.stringify(send));
  }


  logout = (event) => {
    this.setState({ loggedIn: false })
    localStorage.clear('loggedInUser')
    localStorage.clear('loggedInUserToken')
    this.state.navigate("/login")
  }

  login = (event) => {
    this.state.navigate("/login")
  }


  newChatChange = (event) => {
    this.setState({ newChat: event.target.value })
  }

  render() {
    return (
      <div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/messages" element={<Messages />} />
        </Routes>

        <div>
          {this.state.loggedIn ? <div>
            <tbody>
              {/* <h4>Logged in address: {this.state.me}</h4> */}
              <Box sx={{ padding: "10px" }}>
                <Button variant="outlined" onClick={this.logout}>Logout</Button>
              </Box>
              <Box sx={{ padding: "10px", borderColor: 'primary.light' }}>
                <h3>Interacted Wallets</h3>
              </Box>
              {this.renderbase()}

              <div> <form onSubmit={this.newChat}>
                <Box sx={{ padding: "10px" }}>
                  <TextField label="New Chat" color="secondary" focused value={this.state.newChat} onChange={this.newChatChange} size="small" />
                </Box>
              </form></div>
            </tbody>
            {this.state.selected == '' ? <p></p> :
              <Box sx={{ padding: "10px" }}>
                <div><h3>Messages to {this.state.selected}</h3>
                  {this.state.messages[this.state.selected] != undefined ? this.state.messages[this.state.selected].map((obj, i) => <div>
                    <p>{obj.From == this.state.selected ? <b>Received: </b> : <b>sent: </b>} {obj.Text}</p>
                  </div>) : <div></div>}
                  <form onSubmit={this.handleSubmit}>
                    <label>
                      Message:
                      <input type="text" value={this.state.newMessage} onChange={this.handleNewMessage} />
                    </label>
                    <input type="submit" value="Submit" />
                  </form>
                </div>
              </Box>
            }
          </div> :
            <div>
              <Box sx={{ padding: "10px" }}>
                <Button variant="outlined" onClick={this.login}>Login</Button>
              </Box></div>
          }
        </div>
      </div >
    );
  }
}

export default WithRedirect;


class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = { home: false }
  }

  async componentDidMount() {
    const kk = new Web3(Web3.givenProvider || 'http://localhost:7545')
    const accounts = await kk.eth.requestAccounts();
    var account = accounts[0]

    var users = await fetch("http://cryptop2pchat.herokuapp.com/accounts/" + account)
      .then(res => res.json())

    if (Object.keys(users).length === 0) {
      console.log("failed to create")
      return
    }

    this.handleSignMessage(users.Address, users.Nonce, kk)
      .then(({ publicAddress, signature }) => fetch(`http://cryptop2pchat.herokuapp.com/auth-jwt`, {
        body: JSON.stringify({ account, signature }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      }).then(async response => {
        if (response.status == 200) {
          var body = await response.json()
          localStorage.setItem('loggedInUser', account);
          localStorage.setItem('loggedInUserToken', body.token);
          this.setState({ home: true })
        } else {
          alert("Failed to login")
        }
      }))
  }

  login = async (event) => {

  }

  handleSignMessage = (publicAddress, nonce, web3Provider) => {
    return new Promise((resolve, reject) =>
      web3Provider.eth.personal.sign(
        Web3.utils.fromUtf8(`I am signing my one-time nonce: ${nonce}`),
        publicAddress,
        (err, signature) => {
          if (err) return reject(err);
          return resolve({ publicAddress, signature });
        }
      )
    );
  };

  render() {
    return (<div>
      <p>Login</p>
      {this.state.home && <Navigate to='/' replace={true} />}
    </div>)
  }
}

class Messages extends React.Component {
  render() {
    return (<div>
      <p>Messages</p>
    </div>)
  }
}

