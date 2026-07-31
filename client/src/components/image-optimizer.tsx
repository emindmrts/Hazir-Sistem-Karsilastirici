/**
 * Image Optimization Component
 * Lazy loading, WebP format, responsive images
 */

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  priority = false,
  onLoad,
}: OptimizedImageProps) {
  const handleImageLoad = () => {
    if (onLoad) onLoad();
  };

  return (
    <picture>
      {/* WebP format (modern browsers) */}
      <source srcSet={`${src}?format=webp&w=${width}`} type="image/webp" />
      
      {/* Fallback format */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleImageLoad}
        decoding={priority ? 'sync' : 'async'}
        // CSS for responsive images
        style={{
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
    </picture>
  );
}

/**
 * Batch Image Preload (Critical images için)
 */
export function preloadCriticalImages(urls: string[]): void {
  if (!document) return;

  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Responsive Image Source Generator
 */
export function generateSrcSet(
  baseSrc: string,
  sizes: number[] = [320, 640, 960, 1200]
): string {
  return sizes
    .map((size) => `${baseSrc}?w=${size} ${size}w`)
    .join(', ');
}
