import React from 'react';
import './App.css';
import Cookies from 'js-cookie';
import Web3 from 'web3';

const client = new WebSocket("ws://" + window.location.host + "/proxy/ws");

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { messages: {}, selected: '', me: '', newMessage: '', loginUser: '', loggedIn: false, web3Provider: '' };
  }

  async componentDidMount() {
    const kk = new Web3(Web3.givenProvider || 'http://localhost:7545')
    this.setState({ web3Provider: kk })
    console.log(Cookies.get('name'), "Cookies.get('name')")
    const accounts = await kk.eth.requestAccounts();
    var account = accounts[0]
    
    fetch("/proxy/messages")
        .then(async (res) => {
          if (res.status == 200) {
            var body = await res.json()
            this.setState({ messages: body, loggedIn: true, me: Cookies.get('name') })
            this.setUpWebsocket();
          }
        })
  }

  initialize = () => {
    fetch("/proxy/messages")
      .then(async (res) => {
        if (res.status == 200) {
          var body = await res.json()
          this.setState({ messages: body, loggedIn: true })
          this.setUpWebsocket();
        }
      })
  }

  setUpWebsocket = () => {
    client.onopen = () => {
      console.log('WebSocket Client Connected');
    };
    client.onmessage = (evt) => {
      var messages = evt.data;
      var myobj = JSON.parse(messages);
      var allMessages = { ...this.state.messages }
      console.log(myobj, allMessages)
      if (myobj.From === this.state.me) {
        allMessages[myobj.To] = [...allMessages[myobj.To], myobj]
      } else {
        allMessages[myobj.From] = [...allMessages[myobj.From], myobj]
      }

      this.setState({ messages: allMessages, newMessage: '' })
    };
    client.onclose = (message) => {
      console.log(message);
    };
    client.onerror = (message) => {
      console.log(message);
    };
  }

  selectPerson = (person) => {
    this.setState({ selected: person })
  }

  renderbase = () => {
    console.log(this.state)
    return Object.keys(this.state.messages).map((item, index) => {
      return (
        <div><button onClick={() => this.selectPerson(item)}>{item}</button></div>
      )
    })
  }

  work = () => (<p>this is it</p>)

  newMessage = (event) => {
    alert(event.target.value)
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

  login = async (event) => {
    event.preventDefault();
    const accounts = await this.state.web3Provider.eth.requestAccounts();
    var account = accounts[0]
    this.setState({ loginUser: account })
    var users = {};

    users = await fetch("/proxy/accounts/" + account)
      .then(res => res.json())

    if (Object.keys(users).length === 0) {
      console.log("failed to create")
      return
    }

    this.handleSignMessage(users.Address, users.Nonce)
      .then(({ publicAddress, signature }) => fetch(`/proxy/auth`, {
        body: JSON.stringify({ account, signature }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      }).then(response => {
        if (response.status == 200) {
          this.setState({ loggedIn: true, me: this.state.loginUser })
          this.initialize()
          Cookies.set('name', this.state.loginUser)
        }
      }))





    // fetch("/login/" + this.state.loginUser, { method: "POST" })
    //   .then(res => {
    //     if (res.status == 200) {
    //       this.setState({ loggedIn: true, me: this.state.loginUser })
    //       this.initialize()
    //       Cookies.set('name', this.state.loginUser)
    //     }
    //   })
  }

  handleSignMessage = (publicAddress, nonce) => {
    return new Promise((resolve, reject) =>
      this.state.web3Provider.eth.personal.sign(
        Web3.utils.fromUtf8(`I am signing my one-time nonce: ${nonce}`),
        publicAddress,
        (err, signature) => {
          if (err) return reject(err);
          return resolve({ publicAddress, signature });
        }
      )
    );
  };

  logout = (event) => {
    fetch("/proxy/logout")
      .then(res => {
        if (res.status == 200) {
          this.setState({ loggedIn: false })
          Cookies.remove('name')
        }
      })
  }

  handleLoginUser = (event) => {
    this.setState({ loginUser: event.target.value })
  }

  render() {
    return (
      <div>

        {this.state.loggedIn ? <div>
          <tbody>
            <h4>Logged in address: {Cookies.get('name')}</h4>
            <button onClick={this.logout}>Logout</button>
            <h3>Previous Chats</h3>
            {this.renderbase()}
          </tbody>
          {this.state.selected == '' ? <p></p> : <div><h3>Messages to {this.state.selected}</h3>
            {this.state.messages[this.state.selected].map((obj, i) => <div>
              <p>{obj.From == this.state.selected ? <b>Received: </b> : <b>sent: </b>} {obj.Text}</p>
            </div>)}
            <form onSubmit={this.handleSubmit}>
              <label>
                Message:
                <input type="text" value={this.state.newMessage} onChange={this.handleNewMessage} />
              </label>
              <input type="submit" value="Submit" />
            </form>
          </div>
          }
        </div> :
          <div> <form onSubmit={this.login}>
            <input type="text" value={this.state.loginUser} onChange={this.handleLoginUser} />
            <input type="submit" value="login" />
          </form></div>}
      </div>

    );
  }
}

export default App;
