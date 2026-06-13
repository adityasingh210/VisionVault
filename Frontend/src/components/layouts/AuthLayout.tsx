import { Outlet } from 'react-router-dom'
import { Aperture } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Aperture className="text-primary" size={20} />
            </div>
            <span className="text-xl font-semibold text-foreground">PhotoMind</span>
          </div>
          <Outlet />
        </div>
      </div>

      {/* Right — decorative photo collage */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-surface-1">
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-1 p-1 opacity-60">
          {[
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
            'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400',
            'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=400',
            'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400',
            'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400',
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
            'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=400',
            'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400',
            'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=400',
            'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400',
            'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400',
          ].map((src, i) => (
            <div key={i} className="overflow-hidden rounded-lg">
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <blockquote className="text-2xl font-light text-foreground/90 leading-relaxed max-w-sm">
            "Every photo tells a story. Let AI help you remember every one."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            AI-powered photo organization, face recognition, and memories
          </p>
        </div>
      </div>
    </div>
  )
}