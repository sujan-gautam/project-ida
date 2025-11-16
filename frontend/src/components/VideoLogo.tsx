import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import introVideo from '../assets/videos/intro_3.mp4';

interface VideoLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VideoLogo: React.FC<VideoLogoProps> = ({ 
  size = 'md', 
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Ensure loop is set
      video.loop = true;
      video.muted = true;
      
      // Set video properties and load
      video.load();
      
      // Try to play immediately
      const tryPlay = () => {
        if (video && video.paused) {
          video.play().catch(() => {
            // If autoplay fails, try again after user interaction
            console.log('Autoplay prevented, video will play on interaction');
          });
        }
      };

      // Try to play after a short delay
      const timeoutId = setTimeout(tryPlay, 200);

      // Also try when video can play
      const handleCanPlay = () => {
        tryPlay();
      };

      // Try when video is loaded
      const handleLoadedData = () => {
        tryPlay();
      };

      // Try when metadata is loaded
      const handleLoadedMetadata = () => {
        tryPlay();
      };

      // Ensure video loops when it ends
      const handleEnded = () => {
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('ended', handleEnded);

      return () => {
        clearTimeout(timeoutId);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-xl"></div>
      <div 
        className={`${sizeClasses[size]} relative z-10 overflow-hidden cursor-pointer`}
        style={{
          position: 'relative',
        }}
        onClick={() => {
          const video = videoRef.current;
          if (video) {
            video.play().catch((err) => {
              console.error('Click play error:', err);
            });
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault(); // Disable default right-click menu
          navigate('/'); // Navigate to homepage on right-click
        }}
      >
        <video
          ref={videoRef}
          src={introVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: 'scale(0.9)',
            transformOrigin: 'center center',
            zIndex: 1,
            display: 'block',
            opacity: 1,
            filter: 'none',
            maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 85%)',
            WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 85%)',
          }}
          onContextMenu={(e) => {
            e.preventDefault(); // Disable default right-click menu
            navigate('/'); // Navigate to homepage on right-click
          }}
          onLoadedMetadata={() => {
            console.log('Video metadata loaded');
            const video = videoRef.current;
            if (video) {
              video.loop = true;
              video.muted = true;
              console.log('Video src:', video.src);
              console.log('Video readyState:', video.readyState);
              console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
              if (video.paused) {
                video.play().then(() => {
                  console.log('Video started playing');
                }).catch((err) => {
                  console.error('Play error:', err);
                });
              }
            }
          }}
          onLoadedData={() => {
            console.log('Video data loaded');
            const video = videoRef.current;
            if (video && video.paused) {
              video.play().catch((err) => {
                console.error('Play error on loadedData:', err);
              });
            }
          }}
          onCanPlay={() => {
            console.log('Video can play');
            const video = videoRef.current;
            if (video && video.paused) {
              video.play().catch((err) => {
                console.error('Play error on canPlay:', err);
              });
            }
          }}
          onEnded={() => {
            const video = videoRef.current;
            if (video) {
              video.currentTime = 0;
              video.play().catch(() => {});
            }
          }}
          onPlay={() => {
            console.log('✅ Video is playing!');
          }}
          onError={(e) => {
            console.error('❌ Video error:', e);
            const video = videoRef.current;
            if (video) {
              console.error('Video src:', video.src);
              console.error('Video readyState:', video.readyState);
              console.error('Video error code:', video.error?.code);
              console.error('Video error message:', video.error?.message);
            }
          }}
        />
      </div>
    </div>
  );
};

export default VideoLogo;

