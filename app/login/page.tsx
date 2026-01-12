"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { login } from "@/lib/api"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await login(email, password)
      
      localStorage.setItem("accessToken", response.access_token)
      localStorage.setItem("refreshToken", response.refresh_token)
      localStorage.setItem("tokenType", response.token_type)
      localStorage.setItem("user", JSON.stringify(response.user))
      localStorage.setItem("authSession", JSON.stringify({ 
        email, 
        authenticated: true, 
        timestamp: Date.now() 
      }))
      
      router.push("/")
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Login failed"
      setError(errorMessage)
      console.error("Login Error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider: string) => {
    console.log("Social login with:", provider)
  }

  return (
    // ✅ Main Container: Deep dark background for contrast
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* Light Mode Gradient */}
      <div 
        className="absolute inset-0 -z-10 dark:hidden"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fff5f7 35%, #ffe8f0 65%, #ffd6e8 100%)"
        }}
      ></div>
      
      {/* ✅ Dark Mode Gradient: Subtle radial to keep focus on center */}
      <div 
        className="absolute inset-0 -z-10 hidden dark:block"
        style={{
          background: "radial-gradient(circle at 50% 50%, #18181b 0%, #09090b 100%)"
        }}
      ></div>

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* ✅ Card: Solid Zinc-900 background (no blur) for readability */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          
          {/* Card Header */}
          <div className="px-6 md:px-8 pt-8 md:pt-10 pb-6 text-center border-b border-zinc-200 dark:border-zinc-800">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              Welcome Back
            </h1>
            <p className="text-base text-zinc-600 dark:text-zinc-400">
              Sign in to your account to continue
            </p>
          </div>

          {/* Card Content */}
          <div className="px-6 md:px-8 pb-8 md:pb-10 pt-6">
            {error && (
              <div 
                className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm font-medium text-center"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  // ✅ Inputs: Dark black background with clear borders
                  className="w-full py-6 bg-white dark:bg-black border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-6 bg-white dark:bg-black border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full py-6 mt-2 font-bold text-base rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login Button */}
            <Button
              type="button"
              onClick={() => handleSocialLogin("Google")}
              variant="outline"
              // ✅ Social Button: High contrast borders
              className="w-full py-6 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-200 font-medium flex gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 2.43-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Don't have an account?{" "}
                <Link 
                  href="/signup" 
                  className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}