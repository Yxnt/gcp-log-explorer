import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckGcloudAuth, LoginWithGcloud, GetCurrentUser, LoginWithToken, ValidateToken } from '../wailsjs/wailsjs/go/main/App'
import { LogIn, User, Key } from 'lucide-react'

interface LoginPageProps {
  onLoginSuccess: (user: string) => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [currentUser, setCurrentUser] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [isTokenLoading, setIsTokenLoading] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true)
      const isAuthenticated = await CheckGcloudAuth()

      if (isAuthenticated) {
        const user = await GetCurrentUser()
        setCurrentUser(user)
        onLoginSuccess(user)
      }
    } catch (err) {
      console.error('Error checking auth status:', err)
      setError('Failed to check authentication status')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const handleLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      await LoginWithGcloud()

      // Check auth status after login
      const isAuthenticated = await CheckGcloudAuth()
      if (isAuthenticated) {
        const user = await GetCurrentUser()
        setCurrentUser(user)
        onLoginSuccess(user)
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err) {
      setError('Failed to login with Google Cloud. Please ensure gcloud CLI is installed and try again.')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenLogin = async () => {
    if (!token.trim()) {
      setError('Please enter a valid access token')
      return
    }

    setIsTokenLoading(true)
    setError('')

    try {
      // Validate and set the token
      const isValid = await ValidateToken(token.trim())
      if (isValid) {
        await LoginWithToken(token.trim())

        // Get user info after token login
        const user = await GetCurrentUser()
        setCurrentUser(user)
        onLoginSuccess(user)
      } else {
        setError('Invalid access token. Please check your token and try again.')
      }
    } catch (err) {
      setError('Failed to authenticate with token. Please check your token and try again.')
      console.error('Token login error:', err)
    } finally {
      setIsTokenLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking authentication status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-[480px]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              GCP Log Explorer
            </Badge>
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            Choose your authentication method to access Google Cloud logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <User className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">Current user: {currentUser}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Tabs defaultValue="gcloud" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gcloud">
                <LogIn className="mr-2 h-4 w-4" />
                gCloud CLI
              </TabsTrigger>
              <TabsTrigger value="token">
                <Key className="mr-2 h-4 w-4" />
                Access Token
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gcloud" className="space-y-4">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Use the Google Cloud CLI to authenticate
                </p>
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login with Google Cloud CLI
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500">
                  Make sure you have the Google Cloud CLI installed and configured
                </p>
              </div>
            </TabsContent>

            <TabsContent value="token" className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Enter your Google Cloud access token
                </p>
                <div className="space-y-2">
                  <Label htmlFor="token">Access Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="Enter your access token..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={isTokenLoading}
                  />
                </div>
                <Button
                  onClick={handleTokenLogin}
                  disabled={isTokenLoading || !token.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isTokenLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Validating...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Login with Token
                    </>
                  )}
                </Button>
                <div className="text-xs text-gray-500 space-y-2">
                  <p>You can get an access token by running:</p>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs block mt-2">
                    gcloud auth print-access-token
                  </code>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}