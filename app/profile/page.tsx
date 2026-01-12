"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { api } from "@/lib/api"
import { ArrowLeft, Upload, User as UserIcon } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    newPassword: "",
    confirmPassword: "",
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState("")

  // --- 1. Load User Data ---
  useEffect(() => {
    setMounted(true)
    const loadUserData = async () => {
      try {
        const user = await api.user.getProfile()
        
        setFormData(prev => ({
          ...prev,
          name: user.full_name || "",
          email: user.email || "",
        }))

        if (user.avatar_url) {
          setProfileImage(user.avatar_url)
        }
      } catch (err) {
        console.error("Error loading user:", err)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [router])

  // --- 2. Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: "" }))
  }

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, profileImage: "Please upload a valid image file" }))
        return
      }
      if (file.size > 5 * 1024 * 1024) { 
        setErrors(prev => ({ ...prev, profileImage: "Image size should be less than 5MB" }))
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setPreviewImage(result)
        setErrors(prev => ({ ...prev, profileImage: "" }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrors({})
    setSuccessMessage("")

    try {
      const newErrors: Record<string, string> = {}
      if (!formData.name.trim()) newErrors.name = "Name is required"
      
      if (formData.newPassword || formData.confirmPassword) {
        if (formData.newPassword.length < 6) {
          newErrors.newPassword = "Password must be at least 6 characters"
        }
        if (formData.newPassword !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match"
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        setIsSaving(false)
        return
      }

      const payload: { full_name?: string; avatar_url?: string; password?: string } = {
        full_name: formData.name,
      }

      if (previewImage) {
        payload.avatar_url = previewImage
      }

      if (formData.newPassword) {
        payload.password = formData.newPassword
      }

      const updatedUser = await api.user.updateProfile(payload)

      if (previewImage) {
        setProfileImage(previewImage)
        setPreviewImage(null)
      }
      
      const cachedUser = localStorage.getItem("user")
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser)
        localStorage.setItem("user", JSON.stringify({ 
          ...parsed, 
          full_name: updatedUser.full_name || formData.name, 
          avatar_url: updatedUser.avatar_url || parsed.avatar_url 
        }))
      }

      setFormData(prev => ({
        ...prev,
        newPassword: "",
        confirmPassword: "",
      }))

      setSuccessMessage("Profile updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)

    } catch (error: any) {
      console.error("Save error:", error)
      setErrors({ submit: error.message || "Failed to save profile" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    api.auth.logout()
    router.push("/login")
  }

  // --- 3. Loading State ---
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
        <div className="text-center">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    // ✅ Updated Container: Deep dark background (zinc-950) for maximum contrast
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden pb-8 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* Background Gradient - Lighter/Darker Logic */}
      <div 
        className="absolute inset-0 -z-10 dark:hidden"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fff5f7 35%, #ffe8f0 65%, #ffd6e8 100%)"
        }}
      ></div>
      {/* ✅ Dark Mode Gradient: Very subtle, mostly black/zinc to allow content to pop */}
      <div 
        className="absolute inset-0 -z-10 hidden dark:block"
        style={{
          background: "radial-gradient(circle at 50% 0%, #18181b 0%, #09090b 100%)"
        }}
      ></div>

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => router.push("/")}
          // ✅ Updated Link: High contrast hover states
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
      </div>

      <div className="w-full max-w-2xl mt-12 md:mt-0">
        {/* ✅ Updated Card: Solid Zinc-900 background in dark mode (no transparency) for better readability */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          
          {/* Header */}
          <div className="px-6 md:px-8 pt-8 md:pt-10 pb-6 text-center border-b border-zinc-200 dark:border-zinc-800">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              Profile Settings
            </h1>
            <p className="text-base text-zinc-600 dark:text-zinc-400">
              Manage your account information
            </p>
          </div>

          {/* Content */}
          <div className="px-6 md:px-8 py-8 md:py-10">
            {successMessage && (
              <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300 font-medium text-center">{successMessage}</p>
              </div>
            )}

            {errors.submit && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-red-700 dark:text-red-300 font-medium text-center">{errors.submit}</p>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-8">
              {/* Profile Image */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-100 dark:bg-black p-1 shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-700">
                    {previewImage || profileImage ? (
                      <img 
                        src={previewImage || profileImage || ""} 
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover bg-white dark:bg-zinc-800"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <UserIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg hover:scale-105 transition-transform"
                    aria-label="Upload new photo"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  className="hidden"
                />
                
                <div className="text-center">
                  {errors.profileImage && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-1">{errors.profileImage}</p>
                  )}
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Tap icon to change photo
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800" />

              {/* Form Fields - Updated with high contrast inputs */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-200">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    // ✅ Input Update: Darker background, lighter text, visible border
                    className="py-6 bg-white dark:bg-black border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                  />
                  {errors.name && <p className="text-sm text-red-500 dark:text-red-400">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-200">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="py-6 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed opacity-75"
                  />
                </div>
              </div>

              {/* Password Section - Updated contrast */}
              <div className="space-y-4 p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Change Password</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-zinc-700 dark:text-zinc-300">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="bg-white dark:bg-black border-zinc-200 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-zinc-700 dark:text-zinc-300">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="bg-white dark:bg-black border-zinc-200 dark:border-zinc-700 dark:text-zinc-100"
                  />
                  {errors.confirmPassword && <p className="text-sm text-red-500 dark:text-red-400">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button
                  type="submit"
                  className="flex-1 py-6 text-base font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-md transition-all"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                
                <Button
                  type="button"
                  onClick={handleLogout}
                  variant="outline"
                  // ✅ Secondary Button: High contrast border in dark mode
                  className="flex-1 py-6 text-base font-semibold border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Sign Out
                </Button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}