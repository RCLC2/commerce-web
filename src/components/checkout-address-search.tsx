"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

type PostcodeResult = { zonecode: string; address: string };
type PostcodeAPI = {
  Postcode: new (options: {
    oncomplete: (result: PostcodeResult) => void;
    width: string;
    height: string;
  }) => { embed: (element: HTMLElement) => void };
};

export function CheckoutAddressSearch({ onSelect, onClose }: {
  onSelect: (address: { zip_code: string; line1: string }) => void;
  onClose: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || !container.current) return;
    const postcode = (window as Window & { kakao?: PostcodeAPI }).kakao;
    if (!postcode) return;
    const element = container.current;
    new postcode.Postcode({
      width: "100%",
      height: "100%",
      oncomplete: (result) => onSelect({ zip_code: result.zonecode, line1: result.address }),
    }).embed(element);
    return () => { element.replaceChildren(); };
  }, [ready, onSelect]);

  return (
    <section className="rounded-control border border-border-subtle p-3 sm:col-span-2" aria-label="주소 검색">
      <Script
        src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold">도로명·건물명으로 주소 검색</p>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>닫기</Button>
      </div>
      {failed ? <p role="alert" className="text-sm text-status-negative">주소 검색을 불러오지 못했습니다. 아래 주소를 직접 입력하거나 잠시 후 다시 시도해주세요.</p> : null}
      {!ready && !failed ? <p role="status" className="text-sm text-content-secondary">주소 검색을 불러오는 중입니다.</p> : null}
      <div ref={container} className={ready ? "h-[450px] w-full" : "hidden"} />
    </section>
  );
}
