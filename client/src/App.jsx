import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import './App.css'
import './theme.css'
import Home from './pages/Home.jsx'
import SignUp from './pages/auth/SignUpPage.jsx'
import Login from './pages/auth/LoginPage.jsx'
import ForgotPassword from './pages/auth/ForgotPasswordPage.jsx'
import ResetPassword from './pages/auth/ResetPasswordPage.jsx'
import VerifyEmail from './pages/auth/VerifyEmailPage.jsx'

import { Toaster } from 'react-hot-toast'
import { useContext } from 'react'
import { AuthContext } from './context/AuthContext.jsx'
import Header from './components/header.jsx'
import Profile from './pages/Profile.jsx'
import CreatePoll from './pages/polls/CreatePoll.jsx'
import VotePage from './pages/polls/VotePage.jsx'
import Polls from './pages/polls/Polls.jsx'
import Dashbooard from './pages/admin/Dashboard.jsx'
import VideoConferencePage from './pages/Zego/VideoConferencePage.jsx'
import Groups from './pages/Groups.jsx'
import AdminPanel from './pages/admin/AdminPanel.jsx'
import AIChat from './pages/AIChat.jsx'

// Pas de header sur la page de visioconférence : plein écran, avec ses propres boutons de retour
function SiteHeader() {
  const { pathname } = useLocation()
  if (/^\/poll\/[^/]+\/live/.test(pathname)) return null
  return <Header />
}

function App() {
  const { user } = useContext(AuthContext)


  return (
    <>
      <BrowserRouter>
       <SiteHeader />
        <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/register"
                element={user ? <Navigate to="/" replace /> : <SignUp />}
              />
              <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <Login />}
              />
              <Route
                path="/forgot-password"
                element={user ? <Navigate to="/" replace /> : <ForgotPassword />}
              />
              <Route
                path="/reset-password"
                element={user ? <Navigate to="/" replace /> : <ResetPassword />}
              />
              <Route
                path="/verify-email"
                element={user ? <Navigate to="/" replace /> : <VerifyEmail />}
              />
                    <Route path="/profile" element={

                   user ?  <Profile />:  <Navigate to="/" replace /> 
                    } />
                    <Route path='/polls' element={<Polls/>}/>
                    <Route path='/groups' element={
                      user ?  <Groups/>:  <Navigate to="/login" replace />
                      }/>
                    <Route path='/vote/:id' element={
                    
               user ?  <VotePage/>:<Navigate to="/login" replace /> 
                    
                    }
                      />
                    <Route path='/polls/create' element={
                      user ?  <CreatePoll/>:  <Navigate to="/login" replace /> 
                      }/>  <Route path='/poll/:id/live' element={
                      user ?  <VideoConferencePage/>:  <Navigate to="/login" replace /> 
                      }/>
                    <Route path='/polls/dashboard' element={
                 user ?  <Dashbooard/>:  <Navigate to="/" replace />         }
                      />
              <Route path='/admin' element={
                user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" replace />
              } />
              <Route path='/assistant' element={
                user ? <AIChat /> : <Navigate to="/login" replace />
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
         
          
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  )
}

export default App
