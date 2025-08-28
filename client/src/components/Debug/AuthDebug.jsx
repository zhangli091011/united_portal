import { useAuth } from '../../contexts/AuthContext'
import Cookies from 'js-cookie'

const AuthDebug = () => {
  const { user, loading, error } = useAuth()
  const token = Cookies.get('token')

  if (process.env.NODE_ENV !== 'development') {
    return null
  }


}

export default AuthDebug
