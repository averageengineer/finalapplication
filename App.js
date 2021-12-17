import React, {Component} from 'react';
import {StyleSheet, Text, View, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import {BottomNavigation, TextInput} from 'react-native-paper'
import {format} from 'date-fns'
import axios from 'axios';
import NfcManager, {Ndef, NfcTech ,NfcEvents} from 'react-native-nfc-manager';
import bcrypt from 'react-native-bcrypt'
var salt = bcrypt.genSaltSync(10);
function signInWithNameandPassword(name,password,database,isemployee=false){
  for (let value of database) {
    if(isemployee===false){  
      hashedpassword = bcrypt.compareSync(name,password) 
      if(name === value.username && hashedpassword === true){
        return true
      }
    }
  }
  return false
}
export default class App extends Component{

  constructor() {
    super();
    this.state = { 
      name: '', 
      password: '',
      posts: [],
      date: '',
      text: 'rarecode',
      log:'Ready...',
      icon: 'eye-off',
      password_bool: true,
      supported: true,
      enabled: true,
      loggedin: false
    }
  }

  updateInputVal = (val, prop) => {
    const state = this.state;
    state[prop] = val;
    this.setState(state);
  }

  componentDidMount() {
      const RandomNumber = Math.floor(100000000 + Math.random() * 900000000) ;
      this.setState({text:RandomNumber});
      axios.get("http://37.62.41.214:9091/api")
          .then((res)=>{
            Alert.alert('mounted')
            this.setState({posts:res.data})
            console.warn(this.state.posts)
            console.log('Database succesfully connected!')
          })
          .catch((error)=>{
            console.log(error.message)

          })
      NfcManager.isSupported()
        .then(supported => {
            this.setState({ supported });
            if (supported) {
                this._startNfc();
            } else {
              Alert.alert('NFC is required for correct use of this application!')
            }
        })
  }

  _startNfc = () => {
      NfcManager.start()
          .then(() => NfcManager.isEnabled())
          .then(enabled => this.setState({enabled}))
          .catch(err => {
              console.warn(err);
              this.setState({enabled: false})
          })
  }

  readNdef = () =>{
      const cleanUp = () => {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
        NfcManager.setEventListener(NfcEvents.SessionClosed, null);
      };
      
      return new Promise((resolve) => {
        let tagFound = null;
    
        NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag) => {
          tagFound = tag;
          resolve(tagFound);
          Alert.alert('NDEF tag found!')
          console.warn('Tag Discovered', tag);
          this.setState({ tag });

          let parsed = null;
          if (tag.ndefMessage && tag.ndefMessage.length > 0) {
              // ndefMessage is actually an array of NdefRecords, 
              // and we can iterate through each NdefRecord, decode its payload 
              // according to its TNF & type
              const ndefRecords = tag.ndefMessage;
              function decodeNdefRecord(record) {
                  if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
                      console.warn(Ndef.text.decodePayload(record.payload))
                      return ['text', Ndef.text.decodePayload(record.payload)];
                  } else if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
                      return ['uri', Ndef.uri.decodePayload(record.payload)];
                  }

                  return ['unknown', '---']
              }

              parsed = ndefRecords.map(decodeNdefRecord);
              }
          NfcManager.unregisterTagEvent().catch(() => 0);
        });
    
        NfcManager.setEventListener(NfcEvents.SessionClosed, () => {
          cleanUp();
          if (!tagFound) {
            resolve();
          }
        });
    
        NfcManager.registerTagEvent();
      });
  }
    
  writeNdef = async() => {
    let result = false;

    try {
      // Step 1
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Ready to write some NDEF',
      });

      const bytes = Ndef.encodeMessage([Ndef.textRecord(this.state.text)]);

      if (bytes) {
        await NfcManager.writeNdefMessage(bytes); 
        Alert.alert('You have succesfully sent the NFC-signal')
      }
      result = true;
    } catch (ex) {
      console.warn(ex);
    }

    // Step 4
    NfcManager.cancelTechnologyRequest().catch(() => 0);
    return result;
  }

  userLogin = () => {
      if(this.state.name === '' && this.state.password === '') {
        Alert.alert('Enter username and password to proceed!')
      } else {
        if(signInWithNameandPassword(this.state.name,this.state.password,this.state.posts)==true){
          Alert.alert('User login was completed succesfully!')
          this.setState({loggedin:true})
        } else{
          this.setState({loggedin:false})
          Alert.alert('Username or password is incorrect!')
        }
        } 
  } 
  
  _changeIcon() {
        this.setState(prevState=>({
          icon: prevState.icon === 'eye'? 'eye-off': 'eye',
          password_bool: !prevState.password_bool
        }))
  }

  nfc_signal() {
    if (this.state.loggedin==true){
      const datenow = Date.now()
      const datereadable = format(datenow,'yyyy-MM-dd hh:mm:ss a')
      const payload = {
        name: this.state.name,
        text: this.state.text,
        date: datereadable
      }
      this.writeNdef()
      axios({
        url: 'https://37.62.41.214:9091/api/save',
        method: 'POST',
        data: payload
      })
        .then(()=>{
          console.log(payload)
          console.log('Data has been sent to server')
        })  
        .catch((error)=>{
          console.log(error.message)
        })
    }else{
      Alert.alert('You must be logged in to open the door!')
    }
  }

  sub = (base, exponent) => {
    return <View style={{flexDirection: 'row'}}>
        <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.logo}>{base}</Text>
        </View>
        <View style={{alignItems: 'flex-start'}}>
            <Text style={styles.logoupper}>{exponent}</Text>
        </View>
    </View>
  }

  render(){
      return (
        <View style={styles.container}>
          {(() => this.sub('TheDoor','CW2B2'))()}
          <View style={styles.inputView}>     
            <TextInput
              style={styles.inputText}
              placeholder="Name"
              placeholderTextColor="white"
              value={this.state.name}
              onChangeText={(val) => this.updateInputVal(val, 'name')}
              activeUnderlineColor="#465881"
              underlineColor = "#465881"
              backgroundColor = "#465881"
              right = {<TextInput.Icon name='account' style={styles.icon} color='white' backgroundColor="#465881"/>}
            />  
          </View>
          <View style={styles.inputView} >
          <TextInput
              style={styles.inputText}
              placeholder="Password"
              value={this.state.password}
              placeholderTextColor="white"
              onChangeText={(val) => this.updateInputVal(val, 'password')}
              maxLength={15}
              activeUnderlineColor="#465881"
              underlineColor = "#465881"
              secureTextEntry={this.state.password_bool}
              right = {<TextInput.Icon name={this.state.icon} style={styles.icon} color='white' backgroundColor="#465881" onPress={()=>this._changeIcon()}/>}
              backgroundColor = "#465881"
            />
          </View>
          <TouchableOpacity>
          <Text style={styles.forgot} onPress={()=> Alert.alert('Go to the help desk to log in manually!')}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style = {styles.loginBtn}
            onPress={() => this.userLogin()}
          >
            <Text style={styles.loginText}>LOGIN</Text>
          </TouchableOpacity> 
          <TouchableOpacity
            style = {styles.loginBtn}
            onPress = {()=>this.nfc_signal()}
          >
            <Text style={styles.loginText}>NFC-Signal</Text>
          </TouchableOpacity>
        </View> 
      );
    }
}

const styles = StyleSheet.create({
  icon: {
    backgroundColor:"#465881",
    width:"350%",
    height:"217%",
    borderRadius:25,
    paddingLeft:25
  },
  inputText: {
    height:50,
    color:"white"
  },
  inputView:{
    width:"80%",
    backgroundColor:"#465881",
    borderRadius:25,
    height:52,
    marginBottom:20,
    justifyContent:"center",
    padding:20
  },
  loginText:{
    color:"white"
  },
  loginBtn:{
    width:"80%",
    backgroundColor:"#fb5b5a",
    borderRadius:25,
    height:50,
    alignItems:"center",
    justifyContent:"center",
    marginTop:40,
    marginBottom:10
  },
  forgot:{
    color:"white",
    fontSize:11
  },
  logo:{
    flexDirection: 'row',
    fontWeight:"bold",
    fontSize:50,
    color:"#fb5b5a",
    marginBottom:40
  },
  logoupper:{
    fontWeight:"bold",
    fontSize:25,
    color:"#fb5b5a",
    marginBottom:40
  },
  container: {
    flex: 1,
    backgroundColor: '#003f5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon:{
    padding: 10
  },
  inputStyle: {
    width: '100%',
    marginBottom: 15,
    paddingBottom: 15,
    alignSelf: "center",
    borderColor: "white",
    borderBottomWidth: 1
  },
  loginText: {
    fontWeight:'bold',
    color:'white'
  },
});