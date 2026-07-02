import { useEffect } from 'react';

/**
 * Hook: Sayfaları kuyruğa eklemek için (scheduled job ile gönderilir)
 * Google'a 200 URL/gün limitine uyum sağlar
 */
export const useGoogleIndexing = (url: string) => {
  useEffect(() => {
    if (!url) return;

    const queueUrl = async () => {
      try {
        const response = await fetch('/api/indexing/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (response.ok) {
          console.log(`✅ URL indexing kuyruğuna eklendi: ${url}`);
        }
      } catch (error) {
        console.error('URL queue error:', error);
      }
    };

    // Sayfa yüklendiğinde kuyruğa ekle
    queueUrl();
  }, [url]);
};
