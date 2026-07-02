/**
 * Performance Monitoring
 * Core Web Vitals izleme
 */

interface VitalMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
}

export function initPerformanceMonitoring(): void {
  // Web Vitals API varsa kullan
  if ('web-vital' in window) {
    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = require('web-vitals');

      getCLS(onMetric);
      getFID(onMetric);
      getFCP(onMetric);
      getLCP(onMetric);
      getTTFB(onMetric);
    } catch (error) {
      console.error('Web Vitals init error:', error);
    }
  }

  // Performance Observer (fallback)
  observePerformance();
}

function onMetric(metric: any): void {
  console.log('📊 Web Vital:', metric.name, metric.value);

  // Google Analytics'e gönder
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'web_vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

function observePerformance(): void {
  try {
    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('📊 LCP:', lastEntry.renderTime || lastEntry.loadTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          console.log('📊 CLS:', clsValue);
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        console.log('📊 FCP:', entry.startTime);
      });
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
  } catch (error) {
    console.error('Performance observer error:', error);
  }
}

/**
 * Metrics raporu al
 */
export function getPerformanceReport(): VitalMetrics {
  const metrics: VitalMetrics = {
    lcp: 0,
    fid: 0,
    cls: 0,
  };

  // Navigation timing
  const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (perfData) {
    console.log('⏱️ Page Load Time:', perfData.loadEventEnd - perfData.fetchStart);
    console.log('⏱️ DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.fetchStart);
  }

  return metrics;
}

/**
 * Resource Timing raporu
 */
export function getResourceReport(): void {
  const resources = performance.getEntriesByType('resource');
  console.log(`📦 Resources loaded: ${resources.length}`);
  
  resources.forEach((resource) => {
    const timing = resource as PerformanceResourceTiming;
    console.log(`  - ${timing.name}: ${timing.duration.toFixed(2)}ms`);
  });
}
