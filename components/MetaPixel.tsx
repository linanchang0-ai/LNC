"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type MetaPixelParams = Record<string, unknown>;
type MetaPixelFunction = (command: string, event: string, params?: MetaPixelParams) => void;

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}

export default function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();

  useEffect(() => {
    if (!pixelId || !window.fbq) return;

    // 每次路由变化时追踪 PageView
    window.fbq("track", "PageView");
  }, [pathname, pixelId]);

  if (!pixelId) {
    console.warn("NEXT_PUBLIC_META_PIXEL_ID no está configurado");
    return null;
  }

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// 辅助函数：在其他组件中追踪自定义事件
export function trackMetaEvent(eventName: string, params?: MetaPixelParams) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", eventName, params);
  }
}

// 电商标准事件辅助函数
export const metaEvents = {
  viewContent: (params?: MetaPixelParams) => trackMetaEvent("ViewContent", params),
  addToCart: (params?: MetaPixelParams) => trackMetaEvent("AddToCart", params),
  initiateCheckout: (params?: MetaPixelParams) => trackMetaEvent("InitiateCheckout", params),
  purchase: (value: number, currency = "MXN", params?: MetaPixelParams) =>
    trackMetaEvent("Purchase", { value, currency, ...params }),
  addPaymentInfo: (params?: MetaPixelParams) => trackMetaEvent("AddPaymentInfo", params),
  completeRegistration: (params?: MetaPixelParams) => trackMetaEvent("CompleteRegistration", params),
  search: (params?: MetaPixelParams) => trackMetaEvent("Search", params),
};
