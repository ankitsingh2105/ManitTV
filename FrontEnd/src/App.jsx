import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MainPage from './Components/MainPage/MainPage'
import SocketProvider from './Components/VideoCalling/context/SocketProvider'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <SocketProvider>
        
        <center>
          <MainPage />
        </center>
      </SocketProvider>
    </>
  )
}

export default App
