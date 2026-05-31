import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Image as ImageIcon, X, Edit2, Trash2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Post {
  id: string
  author_id: string
  content: string
  image_url?: string
  created_at: string
  updated_at: string
  author: {
    full_name: string
    profile_picture_url?: string
    user_role: string
    professional_profiles?: {
      professional_title?: string
    }
  }
  hashtags: Array<{ id: string; hashtag: string }>
  likes_count: number
  is_liked: boolean
}

type TabType = 'all' | 'my' | 'liked'

export default function PostsPage() {
  const { userProfile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchHashtag, setSearchHashtag] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  
  // Form state
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const isProfessional = userProfile?.user_role !== 'patient'

  useEffect(() => {
    fetchPosts()
  }, [activeTab, searchHashtag, userProfile])

  const fetchPosts = async () => {
    if (!userProfile) return

    try {
      setLoading(true)
      let query = supabase
        .from('posts')
        .select(`
          *,
          author:author_id (
            full_name,
            profile_picture_url,
            user_role,
            professional_profiles (
              professional_title
            )
          )
        `)
        .order('created_at', { ascending: false })

      // Filter based on active tab
      if (activeTab === 'my') {
        query = query.eq('author_id', userProfile.id)
      }

      const { data: postsData, error: postsError } = await query

      if (postsError) throw postsError

      // Fetch hashtags for all posts
      const postIds = postsData?.map(p => p.id) || []
      const { data: hashtagsData } = await supabase
        .from('post_hashtags')
        .select('*')
        .in('post_id', postIds)

      // Fetch likes count for all posts
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds)

      // Combine data
      const postsWithDetails: Post[] = (postsData || []).map(post => {
        const postHashtags = hashtagsData?.filter(h => h.post_id === post.id) || []
        const postLikes = likesData?.filter(l => l.post_id === post.id) || []
        const isLiked = postLikes.some(l => l.user_id === userProfile.id)

        return {
          ...post,
          hashtags: postHashtags,
          likes_count: postLikes.length,
          is_liked: isLiked,
          author: {
            ...post.author,
            professional_profiles: Array.isArray(post.author.professional_profiles)
              ? post.author.professional_profiles[0]
              : post.author.professional_profiles
          }
        }
      })

      // Filter by search hashtag
      let filteredPosts = postsWithDetails
      if (searchHashtag) {
        filteredPosts = postsWithDetails.filter(post =>
          post.hashtags.some(h => h.hashtag.toLowerCase().includes(searchHashtag.toLowerCase()))
        )
      }

      // Filter by liked posts
      if (activeTab === 'liked') {
        filteredPosts = filteredPosts.filter(post => post.is_liked)
      }

      setPosts(filteredPosts)
    } catch (error: any) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async (postId: string): Promise<string | null> => {
    if (!imageFile || !userProfile) return null

    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${userProfile.id}/${postId}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, imageFile, { upsert: true })

      if (uploadError) throw uploadError

      // Store just the file path, we'll generate signed URLs when displaying
      return fileName
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
      return null
    }
  }

  const getImageUrl = (imagePath: string | undefined): string | undefined => {
    if (!imagePath) return undefined
    
    // If it's already a full URL, return it
    if (imagePath.startsWith('http')) return imagePath
    
    // Generate a signed URL that expires in 1 hour
    const { data } = supabase.storage
      .from('post-images')
      .getPublicUrl(imagePath)
    
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content')
      return
    }

    if (content.length > 3000) {
      toast.error('Content must be less than 3000 characters')
      return
    }

    if (!userProfile) return

    try {
      setSubmitting(true)

      if (editingPost) {
        // Update existing post
        const imageUrl = imageFile ? await uploadImage(editingPost.id) : editingPost.image_url

        const { error: updateError } = await supabase
          .from('posts')
          .update({
            content,
            image_url: imageUrl
          })
          .eq('id', editingPost.id)

        if (updateError) throw updateError

        // Delete old hashtags
        await supabase
          .from('post_hashtags')
          .delete()
          .eq('post_id', editingPost.id)

        // Add new hashtags
        const hashtagArray = hashtags
          .split(',')
          .map(h => h.trim())
          .filter(h => h.length > 0)

        if (hashtagArray.length > 0) {
          const hashtagInserts = hashtagArray.map(tag => ({
            post_id: editingPost.id,
            hashtag: tag.startsWith('#') ? tag : `#${tag}`
          }))

          await supabase.from('post_hashtags').insert(hashtagInserts)
        }

        toast.success('Post updated successfully!')
      } else {
        // Create new post
        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert({
            author_id: userProfile.id,
            content,
            image_url: null
          })
          .select()
          .single()

        if (postError) throw postError

        // Upload image if provided
        if (imageFile) {
          const imageUrl = await uploadImage(newPost.id)
          if (imageUrl) {
            await supabase
              .from('posts')
              .update({ image_url: imageUrl })
              .eq('id', newPost.id)
          }
        }

        // Add hashtags
        const hashtagArray = hashtags
          .split(',')
          .map(h => h.trim())
          .filter(h => h.length > 0)

        if (hashtagArray.length > 0) {
          const hashtagInserts = hashtagArray.map(tag => ({
            post_id: newPost.id,
            hashtag: tag.startsWith('#') ? tag : `#${tag}`
          }))

          await supabase.from('post_hashtags').insert(hashtagInserts)
        }

        toast.success('Post created successfully!')
      }

      // Reset form
      setContent('')
      setHashtags('')
      setImageFile(null)
      setImagePreview(null)
      setIsCreateOpen(false)
      setEditingPost(null)
      fetchPosts()
    } catch (error: any) {
      console.error('Error saving post:', error)
      toast.error('Failed to save post')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!userProfile) return

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userProfile.id)
      } else {
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: userProfile.id
          })
      }

      // Update local state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: !isLiked,
            likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1
          }
        }
        return post
      }))
    } catch (error: any) {
      console.error('Error toggling like:', error)
      toast.error('Failed to update like')
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      toast.success('Post deleted successfully!')
      fetchPosts()
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post')
    }
  }

  const handleEdit = (post: Post) => {
    setEditingPost(post)
    setContent(post.content)
    setHashtags(post.hashtags.map(h => h.hashtag.replace('#', '')).join(', '))
    setImagePreview(getImageUrl(post.image_url) || null)
    setIsCreateOpen(true)
  }

  const resetForm = () => {
    setContent('')
    setHashtags('')
    setImageFile(null)
    setImagePreview(null)
    setEditingPost(null)
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full px-4 py-10 sm:px-6 lg:px-12 lg:ml-64">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold text-black font-bold mb-2">
              Community Posts
            </h1>
            <p className="text-muted-foreground">
              Share insights, tips, and connect with the community
            </p>
          </div>

          {isProfessional && (
            <Dialog open={isCreateOpen} onOpenChange={(open: boolean) => {
              setIsCreateOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
                  <DialogDescription>
                    Share your knowledge and insights with the community
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Content */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Content (max 3000 characters)
                    </label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="What's on your mind?"
                      rows={6}
                      maxLength={3000}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {content.length} / 3000 characters
                    </p>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Hashtags (comma separated)
                    </label>
                    <Input
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      placeholder="mentalhealth, wellbeing, tips"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Add hashtags to help others find your post
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Image (optional, max 10MB)
                    </label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('post-image')?.click()}
                        className="gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Choose Image
                      </Button>
                      <input
                        id="post-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </div>

                    {imagePreview && (
                      <div className="relative mt-4 rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-64 object-cover"
                        />
                        <button
                          onClick={() => {
                            setImageFile(null)
                            setImagePreview(null)
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !content.trim()}
                      className="flex-1"
                    >
                      {submitting ? 'Saving...' : editingPost ? 'Update Post' : 'Create Post'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateOpen(false)
                        resetForm()
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'glass-card hover:bg-muted'
              }`}
            >
              All Posts
            </button>
            {isProfessional && (
              <button
                onClick={() => setActiveTab('my')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'my'
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-card hover:bg-muted'
                }`}
              >
                My Posts
              </button>
            )}
            <button
              onClick={() => setActiveTab('liked')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'liked'
                  ? 'bg-primary text-primary-foreground'
                  : 'glass-card hover:bg-muted'
              }`}
            >
              Liked Posts
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchHashtag}
              onChange={(e) => setSearchHashtag(e.target.value)}
              placeholder="Search by hashtag..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl">
            <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No posts found</h3>
            <p className="text-muted-foreground">
              {activeTab === 'my'
                ? 'Create your first post to get started!'
                : activeTab === 'liked'
                ? "You haven't liked any posts yet"
                : 'Be the first to create a post!'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-card rounded-2xl p-6 border border-border/50"
                >
                  {/* Author Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xl font-bold">
                        {post.author.profile_picture_url ? (
                          <img
                            src={post.author.profile_picture_url}
                            alt={post.author.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          post.author.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{post.author.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {post.author.professional_profiles?.professional_title || post.author.user_role}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Edit/Delete for own posts */}
                    {post.author_id === userProfile?.id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(post)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 hover:bg-destructive/20 rounded-lg transition-colors text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Post Image */}
                  {post.image_url && getImageUrl(post.image_url) && (
                    <div 
                      className="mb-4 rounded-lg overflow-hidden cursor-pointer group relative"
                      onClick={() => setLightboxImage(getImageUrl(post.image_url) || null)}
                    >
                      <img
                        src={getImageUrl(post.image_url)}
                        alt="Post"
                        className="w-full object-contain max-h-[500px] bg-gray-100 transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg font-bold bg-black/50 px-4 py-2 rounded-lg">
                          Click to expand
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>

                  {/* Hashtags */}
                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.hashtags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => setSearchHashtag(tag.hashtag.replace('#', ''))}
                          className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          {tag.hashtag}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-6 pt-4 border-t border-border/50">
                    <button
                      onClick={() => handleLike(post.id, post.is_liked)}
                      className={`flex items-center gap-2 transition-colors ${
                        post.is_liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-medium">{post.likes_count}</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg hover:bg-white/20 transition-colors flex items-center justify-center group"
              >
                <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </button>
              <img
                src={lightboxImage}
                alt="Full size"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

