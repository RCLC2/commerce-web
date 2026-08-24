"use client";

import { ChevronDown, ChevronUp, Code2, Eye, FileCode2, ImagePlus, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  createProductDetailBlock,
  type ProductDetailBlock,
  type ProductDetailBlockType,
  type ProductDetailDocument,
  withProductDetailBlocks,
  withProductDetailHTML,
} from "@/lib/product-detail-document";
import { Button } from "./ui/button";

type EditorTab = "blocks" | "html" | "preview";

const blockLabels: Record<ProductDetailBlockType, string> = {
  hero: "대표 소개",
  text: "텍스트",
  image: "이미지",
  features: "핵심 포인트",
  notice: "안내",
  divider: "구분선",
  button: "링크 버튼",
};

const addableBlockTypes: ProductDetailBlockType[] = ["text", "image", "features", "notice", "divider", "button"];

export function ProductDetailEditor({ value, onChange }: { value: ProductDetailDocument; onChange: (next: ProductDetailDocument) => void }) {
  const [tab, setTab] = useState<EditorTab>("blocks");
  const [message, setMessage] = useState("");

  function commitBlocks(blocks: ProductDetailBlock[]) {
    onChange(withProductDetailBlocks(value, blocks));
  }

  function updateBlock(index: number, patch: Partial<ProductDetailBlock>) {
    commitBlocks(value.blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } : block));
  }

  function addBlock(type: ProductDetailBlockType) {
    commitBlocks([...value.blocks, createProductDetailBlock(type)]);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.blocks.length) return;
    const blocks = [...value.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    commitBlocks(blocks);
  }

  function applyTemplate(kind: "story" | "fit") {
    const blocks = kind === "story"
      ? [
        createProductDetailBlock("hero", { eyebrow: "NEW SEASON", title: "매일 손이 가는 한 벌", body: "소재부터 실루엣까지, 편안하게 오래 입을 수 있도록 완성했습니다.", align: "center" }),
        createProductDetailBlock("image", { imageURL: "", imageAlt: "상품 디테일 이미지", body: "상품의 질감과 디테일을 사진으로 보여주세요." }),
        createProductDetailBlock("features", { title: "이런 점이 좋아요", items: ["가볍고 편안한 착용감", "매일 입기 좋은 실루엣", "꼼꼼하게 마감한 디테일"] }),
        createProductDetailBlock("notice", { title: "구매 전 확인해 주세요", body: "모니터 환경에 따라 실제 색상과 다르게 보일 수 있습니다." }),
      ]
      : [
        createProductDetailBlock("hero", { eyebrow: "FIT GUIDE", title: "나에게 맞는 사이즈 찾기", body: "평소 즐겨 입는 옷과 실측을 비교해 보세요.", align: "center" }),
        createProductDetailBlock("features", { title: "사이즈 선택 팁", items: ["여유로운 핏을 원하면 한 사이즈 업", "정사이즈는 평소 착용 사이즈", "상세 실측은 하단 표를 확인"] }),
        createProductDetailBlock("notice", { title: "측정 안내", body: "실측은 측정 방식에 따라 1~3cm 오차가 있을 수 있습니다." }),
      ];
    commitBlocks(blocks);
    setMessage("템플릿을 적용했습니다. 내용과 이미지를 상품에 맞게 바꿔 주세요.");
    setTab("blocks");
  }

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-line bg-white" aria-labelledby="detail-editor-title">
      <div className="border-b border-line bg-zinc-50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-brand"><LayoutTemplate size={18} /><p className="text-xs font-black uppercase tracking-[0.16em]">Detail studio</p></div>
            <h3 id="detail-editor-title" className="mt-1 text-lg font-black">상품 상세페이지 만들기</h3>
            <p className="mt-1 text-sm text-muted">블록을 조합하거나 HTML을 직접 작성한 뒤, 고객 화면과 같은 폭으로 미리 볼 수 있습니다.</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 shadow-sm">블록 {value.blocks.length}개</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="상세페이지 편집 방식">
          <EditorTabButton active={tab === "blocks"} onClick={() => setTab("blocks")} icon={<LayoutTemplate size={15} />}>구성하기</EditorTabButton>
          <EditorTabButton active={tab === "html"} onClick={() => setTab("html")} icon={<Code2 size={15} />}>HTML 직접 편집</EditorTabButton>
          <EditorTabButton active={tab === "preview"} onClick={() => setTab("preview")} icon={<Eye size={15} />}>미리보기</EditorTabButton>
        </div>
      </div>

      {tab === "blocks" ? (
        <div className="p-4 sm:p-5">
          <div className="rounded-lg border border-dashed border-line bg-zinc-50 p-3">
            <p className="text-sm font-black">빠른 시작 템플릿</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => applyTemplate("story")}>상품 소개 기본형</Button>
              <Button size="sm" variant="secondary" onClick={() => applyTemplate("fit")}>사이즈 가이드</Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="상세페이지 블록 추가">
            {addableBlockTypes.map((type) => <Button key={type} size="sm" variant="secondary" onClick={() => addBlock(type)}><Plus size={14} /> {blockLabels[type]}</Button>)}
          </div>

          {value.blocks.length ? <div className="mt-4 space-y-3">{value.blocks.map((block, index) => (
            <DetailBlockCard
              key={block.id}
              block={block}
              index={index}
              isFirst={index === 0}
              isLast={index === value.blocks.length - 1}
              onChange={(patch) => updateBlock(index, patch)}
              onMove={(direction) => moveBlock(index, direction)}
              onDelete={() => commitBlocks(value.blocks.filter((_, blockIndex) => blockIndex !== index))}
            />
          ))}</div> : (
            <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
              <ImagePlus size={26} className="text-zinc-400" />
              <p className="mt-3 font-black">상세페이지를 구성해 보세요</p>
              <p className="mt-1 text-sm text-muted">템플릿을 적용하거나 위 버튼으로 블록을 추가하면 바로 HTML이 만들어집니다.</p>
            </div>
          )}
          {message ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800" role="status">{message}</p> : null}
        </div>
      ) : null}

      {tab === "html" ? (
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black">HTML 소스</p>
              <p className="mt-1 text-xs text-muted">스크립트, 이벤트 속성 등 위험한 코드는 저장 시 서버에서 제거됩니다.</p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-bold">
              <FileCode2 size={15} /> HTML 가져오기
              <input
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void file.text().then((html) => onChange(withProductDetailHTML(value, html)));
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {value.blocks.length ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">HTML을 수정하면 이 HTML이 최종 내용이 되며, 블록 구성은 초기화됩니다.</p> : null}
          <textarea
            className="mt-3 min-h-80 w-full rounded-lg border border-line bg-zinc-950 px-4 py-3 font-mono text-xs leading-6 text-zinc-100 outline-none focus:border-brand"
            value={value.html}
            onChange={(event) => onChange(withProductDetailHTML(value, event.target.value))}
            placeholder={'<section class="detail-band">...</section>'}
            aria-label="상품 상세 HTML"
            spellCheck={false}
          />
        </div>
      ) : null}

      {tab === "preview" ? (
        <div className="bg-zinc-100 p-4 sm:p-5">
          <div className="mx-auto max-w-[640px] rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-2 pb-2 text-xs font-bold text-muted"><span>고객 화면 미리보기</span><span>640px</span></div>
            <iframe title="상품 상세페이지 미리보기" sandbox="" referrerPolicy="no-referrer" srcDoc={value.html} className="min-h-[520px] w-full bg-white" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function EditorTabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold transition ${active ? "bg-foreground text-background" : "border border-line bg-white text-zinc-700 hover:bg-zinc-100"}`}>{icon}{children}</button>;
}

function DetailBlockCard({ block, index, isFirst, isLast, onChange, onMove, onDelete }: { block: ProductDetailBlock; index: number; isFirst: boolean; isLast: boolean; onChange: (patch: Partial<ProductDetailBlock>) => void; onMove: (direction: -1 | 1) => void; onDelete: () => void }) {
  const showCopy = block.type !== "divider";
  const showImage = block.type === "hero" || block.type === "image";
  return (
    <article className="rounded-xl border border-line p-3 sm:p-4" aria-label={`${index + 1}번째 ${blockLabels[block.type]} 블록`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-100 text-xs font-black text-zinc-600">{index + 1}</span><p className="text-sm font-black">{blockLabels[block.type]}</p></div>
        <div className="flex gap-1">
          <Button size="icon" variant="secondary" disabled={isFirst} onClick={() => onMove(-1)} aria-label="위로 이동"><ChevronUp size={16} /></Button>
          <Button size="icon" variant="secondary" disabled={isLast} onClick={() => onMove(1)} aria-label="아래로 이동"><ChevronDown size={16} /></Button>
          <Button size="icon" variant="secondary" onClick={onDelete} aria-label="블록 삭제"><Trash2 size={16} /></Button>
        </div>
      </div>
      {showCopy ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(block.type === "hero" || block.type === "text") ? <TextInput label="상단 문구" value={block.eyebrow} onChange={(eyebrow) => onChange({ eyebrow })} /> : null}
        {block.type !== "image" ? <TextInput label={block.type === "button" ? "버튼 기본 문구" : "제목"} value={block.title} onChange={(title) => onChange({ title })} /> : null}
        {(block.type === "hero" || block.type === "text" || block.type === "features" || block.type === "notice" || block.type === "image") ? <label className="sm:col-span-2"><span className="text-xs font-bold text-muted">본문</span><textarea className="mt-1 min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm" value={block.body} onChange={(event) => onChange({ body: event.target.value })} /></label> : null}
        {block.type === "features" ? <label className="sm:col-span-2"><span className="text-xs font-bold text-muted">핵심 포인트 (한 줄에 하나씩)</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm" value={block.items.join("\n")} onChange={(event) => onChange({ items: event.target.value.split("\n") })} /></label> : null}
        {block.type === "button" ? <><TextInput label="버튼 문구" value={block.label} onChange={(label) => onChange({ label })} /><TextInput label="연결 URL" value={block.href} onChange={(href) => onChange({ href })} placeholder="https://" /></> : null}
        {block.type !== "image" && block.type !== "button" ? <label><span className="text-xs font-bold text-muted">정렬</span><select className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm" value={block.align} onChange={(event) => onChange({ align: event.target.value === "center" ? "center" : "left" })}><option value="left">왼쪽</option><option value="center">가운데</option></select></label> : null}
      </div> : null}
      {showImage ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><TextInput label="이미지 URL" value={block.imageURL} onChange={(imageURL) => onChange({ imageURL })} placeholder="https://" /><TextInput label="이미지 대체 텍스트" value={block.imageAlt} onChange={(imageAlt) => onChange({ imageAlt })} /></div> : null}
    </article>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label><span className="text-xs font-bold text-muted">{label}</span><input className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}
