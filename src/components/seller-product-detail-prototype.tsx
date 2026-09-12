"use client";

// PROTOTYPE: three PC layouts on /seller/products?prototype=detail-editor&variant=A.
// Question: which editing layout fits the existing seller console? All edits stay in memory.
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronRight, Copy, Eye, FileCode2, GripVertical, ImagePlus, LayoutTemplate, Monitor, PanelLeft, Plus, Redo2, Save, Search, Smartphone, Trash2, Type, Undo2, Upload, Video, X } from "lucide-react";
import shirt from "../../docs/design-system/assets/linen-shirt-product.png";
import { SellerConsoleLayoutV2 } from "./seller-shell";
import { Button } from "./ui/button";
import { Input, Select, Textarea } from "./ui/input";
import { Dialog } from "./ui/overlay";
import { PrototypeSwitcher } from "./ui/prototype-switcher";
import styles from "./seller-product-detail-prototype.module.css";

type Block = { id: string; kind: "hero" | "image" | "text" | "size" | "notice" | "video"; title: string; body: string; eyebrow?: string; src?: string; align?: "left" | "center" };
type Template = { id: string; name: string; note: string; tone: string; blocks: Block[]; personal?: boolean };
const variants = [{ key: "A", name: "한눈에 편집하는 작업실" }, { key: "B", name: "입력과 미리보기 나란히" }, { key: "C", name: "순서대로 만드는 상세페이지" }];
const initialBlocks: Block[] = [
  { id: "hero", kind: "hero", eyebrow: "THE EVERYDAY COLLECTION", title: "가볍게 걸치는,\n기분 좋은 일상", body: "자연스러운 결, 부드러운 촉감.\n매일 손이 가는 데일리 린넨 셔츠를 만나보세요.", align: "center" },
  { id: "image", kind: "image", title: "상품 이미지", body: "내추럴 아이보리", src: shirt.src },
  { id: "text", kind: "text", title: "좋은 옷의 시작은, 좋은 소재", body: "린넨의 산뜻함에 코튼의 부드러움을 더했어요.\n여유 있는 실루엣으로 하루 종일 편안하게.", align: "center" },
  { id: "size", kind: "size", title: "나에게 맞는 사이즈", body: "단위 cm · 측정 방법에 따라 1–3cm 오차가 있을 수 있습니다." },
  { id: "notice", kind: "notice", title: "구매 전 확인해 주세요", body: "모니터 환경에 따라 실제 색상과 차이가 있을 수 있습니다.\n오래 입을 수 있도록 첫 세탁은 드라이클리닝을 권장합니다." },
];
const templates: Template[] = [
  { id: "basic", name: "에센셜 스토리", note: "담백한 상품 소개 · 5개 블록", tone: "cream", blocks: initialBlocks },
  { id: "editorial", name: "에디토리얼", note: "이미지가 돋보이는 구성 · 4개 블록", tone: "dark", blocks: [initialBlocks[1], { ...initialBlocks[0], eyebrow: "LESS, BUT BETTER", title: "일상에 스며드는\n가장 자연스러운 옷", align: "left" }, initialBlocks[2], initialBlocks[4]] },
  { id: "fit", name: "핏 & 디테일", note: "소재와 실측 중심 · 4개 블록", tone: "sage", blocks: [{ ...initialBlocks[0], eyebrow: "FIND YOUR PERFECT FIT", title: "입을수록 편안한,\n나만의 핏" }, initialBlocks[1], initialBlocks[3], initialBlocks[4]] },
];
const labels: Record<Block["kind"], string> = { hero: "대표 소개", image: "이미지", text: "텍스트", size: "사이즈 표", notice: "구매 안내", video: "동영상" };
const icons = { hero: LayoutTemplate, image: ImagePlus, text: Type, size: PanelLeft, notice: FileCode2, video: Video };

export function SellerProductDetailPrototype() {
  const params = useSearchParams();
  const variant = variants.find((item) => item.key === params.get("variant"))?.key ?? "A";
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selected, setSelected] = useState("hero");
  const [libraryTab, setLibraryTab] = useState("기본 템플릿");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [personal, setPersonal] = useState<Template[]>([{ ...templates[0], id: "personal-default", name: "우리 마켓 기본 양식", personal: true }]);
  const [appliedBlocks, setAppliedBlocks] = useState<Block[]>(initialBlocks);
  const [savedBlocks, setSavedBlocks] = useState<Block[]>(initialBlocks);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  const [preview, setPreview] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [dialog, setDialog] = useState<"upload" | "save-template" | "video" | "templates" | "leave-editor" | null>(null);
  const [replacingImageID, setReplacingImageID] = useState<string>();
  const [templateName, setTemplateName] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<string>();
  const [pendingTemplate, setPendingTemplate] = useState<Template>();
  const [videoURL, setVideoURL] = useState("");
  const [toast, setToast] = useState("");
  const [step, setStep] = useState(1);
  const [parentView, setParentView] = useState(false);
  const [dragID, setDragID] = useState<string>();
  const [importText, setImportText] = useState("");
  const [importName, setImportName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const pendingScrollID = useRef<string | null>(null);
  const active = blocks.find((block) => block.id === selected) ?? blocks[0];
  const hasUnappliedChanges = JSON.stringify(blocks) !== JSON.stringify(appliedBlocks);
  const hasUnsavedChanges = JSON.stringify(appliedBlocks) !== JSON.stringify(savedBlocks);
  const previewBlocks = parentView ? appliedBlocks : blocks;
  const status = hasUnappliedChanges ? "편집 중 · 미적용" : hasUnsavedChanges ? "적용됨 · 저장 전" : saved ? "저장됨 · 체험" : "변경 없음";

  useEffect(() => { console.info("[PC UI prototype state]", { variant, blocks, appliedBlocks, savedBlocks, selected, personal, saved, step }); }, [variant, blocks, appliedBlocks, savedBlocks, selected, personal, saved, step]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3400); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!pendingScrollID.current || parentView) return;
    const frame = window.requestAnimationFrame(() => {
      const target = editorRef.current?.querySelector<HTMLElement>(`[data-block-id="${pendingScrollID.current}"]`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      target.focus({ preventScroll: true });
      pendingScrollID.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [blocks, parentView, step, variant]);

  function commit(next: Block[]) { setHistory((items) => [...items.slice(-39), blocks]); setFuture([]); setBlocks(next); }
  function patch(patch: Partial<Block>) { commit(blocks.map((block) => block.id === active?.id ? { ...block, ...patch } : block)); }
  function undo() { const previous = history.at(-1); if (!previous) return; setFuture((items) => [blocks, ...items]); setHistory((items) => items.slice(0, -1)); setBlocks(previous); }
  function redo() { if (!future[0]) return; setHistory((items) => [...items, blocks]); setBlocks(future[0]); setFuture((items) => items.slice(1)); }
  function select(id: string) { setSelected(id); editorRef.current?.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  function selectNewBlock(id: string) { pendingScrollID.current = id; setSelected(id); }
  function move(id: string, direction: number) { const index = blocks.findIndex((block) => block.id === id); const target = index + direction; if (target < 0 || target >= blocks.length) return; const next = [...blocks]; [next[index], next[target]] = [next[target], next[index]]; commit(next); }
  function add(kind: Block["kind"]) { const id = crypto.randomUUID(); commit([...blocks, { id, kind, title: kind === "text" ? "상품의 매력을 소개해 주세요" : labels[kind], body: "상품에 맞게 내용을 입력해 주세요.", align: "center", ...(kind === "image" ? { src: shirt.src } : {}) }]); selectNewBlock(id); setToast(`${labels[kind]} 블록을 추가했습니다.`); }
  function applyTemplate(template: Template, append = false) { const copied = template.blocks.map((block) => ({ ...block, id: crypto.randomUUID() })); commit(append ? [...blocks, ...copied] : copied); selectNewBlock(copied[0]?.id ?? ""); setPendingTemplate(undefined); setDialog(null); setToast(`${template.name} 템플릿을 ${append ? "추가" : "적용"}했습니다.`); if (variant === "C") setStep(2); }
  function apply() { setAppliedBlocks(structuredClone(blocks)); setParentView(true); setPreview(false); setDialog(null); setToast("상품 수정 화면에 적용했습니다. 변경 저장을 눌러 마무리하세요."); }
  function openBasicInfo() { if (hasUnappliedChanges) { setDialog("leave-editor"); return; } setParentView(true); }
  function saveProduct() { if (hasUnappliedChanges) { setDialog("leave-editor"); return; } setSavedBlocks(structuredClone(appliedBlocks)); setSaved(true); setToast("저장 흐름을 확인했습니다. 실제 상품은 변경되지 않습니다."); }
  function openUpload(imageID?: string) { setReplacingImageID(imageID); setImportText(""); setImportName(""); setDialog("upload"); }
  function saveTemplate() { if (!templateName.trim()) return; const next: Template = { id: editingTemplate ?? crypto.randomUUID(), name: templateName.trim(), note: `${blocks.length}개 블록 · 내 템플릿`, tone: "cream", blocks: structuredClone(blocks), personal: true }; setPersonal((items) => editingTemplate ? items.map((item) => item.id === editingTemplate ? next : item) : [...items, next]); setDialog(null); setLibraryTab("내 템플릿"); setEditingTemplate(undefined); setTemplateName(""); setToast("내 템플릿에 저장했습니다. 이 체험 화면에서만 유지됩니다."); }
  async function readFiles(files: FileList | File[] | null) {
    if (!files?.length) return;
    if (replacingImageID && files.length !== 1) { setToast("교체할 이미지 한 장을 선택해 주세요."); return; }
    const images: Block[] = [];
    for (const file of Array.from(files)) {
      if (!replacingImageID && (file.type === "text/html" || /\.html?$/i.test(file.name))) { setImportName(file.name); setImportText(await file.text()); continue; }
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { setToast(replacingImageID ? "JPG, PNG, WebP, GIF 이미지를 선택해 주세요." : "JPG, PNG, WebP, GIF, HTML 파일을 선택해 주세요."); continue; }
      if (file.size > 20 * 1024 * 1024) { setToast("체험용 이미지는 20MB 이하로 선택해 주세요."); continue; }
      const src = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
      images.push({ id: crypto.randomUUID(), kind: "image", title: file.name, body: file.type === "image/gif" ? "GIF 이미지" : "", src });
    }
    if (images.length) {
      if (replacingImageID) {
        commit(blocks.map((block) => block.id === replacingImageID ? { ...block, src: images[0].src } : block));
        selectNewBlock(replacingImageID);
        setToast("이미지를 교체했습니다. 위치와 설명은 그대로 유지됩니다.");
      } else {
        commit([...blocks, ...images]); selectNewBlock(images[0].id);
        setToast(`${images.length}개 이미지를 추가했습니다. 서버에 전송하지 않습니다.`);
      }
      setDialog(null); setReplacingImageID(undefined);
    }
  }
  function insertVideo() { let id = ""; try { const url = new URL(videoURL); if (url.hostname === "youtu.be") id = url.pathname.slice(1); if (["youtube.com", "www.youtube.com"].includes(url.hostname)) id = url.searchParams.get("v") ?? url.pathname.split("/").at(-1) ?? ""; } catch { /* Fixture-only URL input. */ } if (!/^[\w-]{11}$/.test(id)) { setToast("올바른 YouTube 영상 링크를 입력해 주세요."); return; } const block: Block = { id: crypto.randomUUID(), kind: "video", title: "영상으로 만나는 디테일", body: id }; commit([...blocks, block]); selectNewBlock(block.id); setDialog(null); setVideoURL(""); setToast("영상 블록을 추가했습니다. 체험 화면에서는 재생 위치를 표시합니다."); }

  const templateCards = (large = false) => <div className={large ? styles.templateGrid : styles.templateList}>
    {(libraryTab === "내 템플릿" ? personal : templates).filter((item) => item.name.includes(libraryQuery)).map((template) => <article className={styles.templateItem} key={template.id}>
      <button type="button" className={styles.templatePick} onClick={() => { setDialog(null); setPendingTemplate(template); }}>
        <div className={`${styles.templateCover} ${styles[template.tone]}`}><div className={styles.coverCopy}><small>{template.tone === "dark" ? "NEW PERSPECTIVE" : "THE EVERYDAY COLLECTION"}</small><strong>{template.tone === "sage" ? "나에게 맞는\n가장 편안한 핏" : template.tone === "dark" ? "LESS,\nBUT BETTER." : "자연스럽게,\n오래도록"}</strong><span /></div><Image src={shirt} alt="린넨 셔츠 템플릿 예시" className={styles.coverImage} sizes="240px" /><span className={styles.coverUse}>이 템플릿 사용 <ArrowRight size={12} /></span></div>
        <div className={styles.templateCaption}><strong>{template.name}</strong>{template.id === "basic" && <span>추천</span>}</div><p>{template.note}</p>
      </button>
      {template.personal && <div className={styles.templateActions}><button onClick={() => { setTemplateName(template.name); setEditingTemplate(template.id); setDialog("save-template"); }}>현재 구성으로 수정</button><button aria-label={`${template.name} 삭제`} onClick={() => { setPersonal((items) => items.filter((item) => item.id !== template.id)); setToast("템플릿을 삭제했습니다. 상품 구성은 유지됩니다."); }}><Trash2 size={12} /></button></div>}
    </article>)}
    {libraryTab === "내 템플릿" && !personal.length && <p className={styles.empty}>자주 쓰는 구성을 내 템플릿으로 저장해 보세요.</p>}
  </div>;

  const library = <aside className={styles.library}><div className={styles.panelHeading}><LayoutTemplate size={16} /><strong>템플릿</strong></div><div className={styles.tabRow}>{["기본 템플릿", "내 템플릿"].map((name) => <button key={name} data-active={libraryTab === name} onClick={() => setLibraryTab(name)}>{name}</button>)}</div><div className={styles.librarySearch}><Search size={14} /><input aria-label="템플릿 검색" placeholder="템플릿 검색" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} /></div>{templateCards()}<div className={styles.libraryBottom}><Button size="sm" variant="secondary" onClick={() => { setEditingTemplate(undefined); setTemplateName(""); setDialog("save-template"); }}><Plus size={13} />내 템플릿으로 저장</Button><p>마음에 드는 구성을 다시 사용하세요.</p></div></aside>;

  const inspector = <aside className={styles.inspector}><div className={styles.panelHeading}><strong>블록 설정</strong><span>{active ? labels[active.kind] : "선택 없음"}</span></div>{active ? <>
    <div className={styles.selectedBlockName}><span className={styles.blockIcon}>{(() => { const Icon = icons[active.kind]; return <Icon size={16} />; })()}</span><div><strong>{labels[active.kind]}</strong><p>{blocks.findIndex((block) => block.id === active.id) + 1}번째 블록</p></div><Button variant="ghost" size="sm" aria-label="선택 블록 복제" onClick={() => { const id = crypto.randomUUID(); const next = [...blocks]; next.splice(next.findIndex((block) => block.id === active.id) + 1, 0, { ...active, id }); commit(next); selectNewBlock(id); }}><Copy size={14} /></Button></div>
    <div className={styles.fields}>{active.kind === "hero" && <Field label="상단 문구"><Input aria-label="상단 문구" value={active.eyebrow ?? ""} onChange={(event) => patch({ eyebrow: event.target.value })} /></Field>}<Field label={active.kind === "image" ? "이미지 설명" : "제목"}><Textarea aria-label="블록 제목" className="min-h-20" value={active.title} onChange={(event) => patch({ title: event.target.value })} /></Field><Field label={active.kind === "video" ? "YouTube 영상 ID" : "본문"}><Textarea aria-label="블록 본문" className="min-h-28" value={active.body} onChange={(event) => patch({ body: event.target.value })} /></Field>{["hero", "text", "notice"].includes(active.kind) && <Field label="텍스트 정렬"><div className={styles.alignControls}><button data-active={active.align === "left"} onClick={() => patch({ align: "left" })}>왼쪽</button><button data-active={active.align !== "left"} onClick={() => patch({ align: "center" })}>가운데</button></div></Field>}{active.kind === "image" && <Button size="sm" variant="secondary" onClick={() => openUpload(active.id)}><Upload size={14} />이미지 교체</Button>}{active.kind === "size" && <p className={styles.helper}>실측값은 시안용 고정 샘플입니다. 현재는 제목과 안내 문구를 수정할 수 있어요.</p>}</div>
    <div className={styles.inspectorHint}><Eye size={15} /><p>수정한 내용이 가운데 화면에<br />바로 반영됩니다.</p></div>
  </> : <p className={styles.empty}>편집할 블록을 선택해 주세요.</p>}
    <div className={styles.outline}><div className={styles.panelHeading}><strong>페이지 구성</strong><span>{blocks.length}개</span></div>{blocks.map((block, index) => { const Icon = icons[block.kind]; return <div key={block.id} className={styles.outlineRow} data-selected={block.id === active?.id} draggable onDragStart={() => setDragID(block.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!dragID || dragID === block.id) return; const next = blocks.filter((item) => item.id !== dragID); const moved = blocks.find((item) => item.id === dragID); if (moved) { next.splice(next.findIndex((item) => item.id === block.id), 0, moved); commit(next); } setDragID(undefined); }}><GripVertical size={12} /><button onClick={() => select(block.id)}><span>{String(index + 1).padStart(2, "0")}</span><Icon size={13} />{labels[block.kind]}</button><button aria-label={`${index + 1}번째 블록 위로`} disabled={index === 0} onClick={() => move(block.id, -1)}><ArrowUp size={12} /></button><button aria-label={`${index + 1}번째 블록 아래로`} disabled={index === blocks.length - 1} onClick={() => move(block.id, 1)}><ArrowDown size={12} /></button></div>; })}</div>
  </aside>;

  const additions = <div className={styles.additions}><span>블록 추가</span><Button size="sm" variant="ghost" onClick={() => add("text")}><Type size={14} />텍스트</Button><Button size="sm" variant="ghost" onClick={() => openUpload()}><ImagePlus size={14} />이미지·GIF</Button><Button size="sm" variant="ghost" onClick={() => setDialog("video")}><Video size={14} />동영상</Button><Button size="sm" variant="ghost" onClick={() => add("size")}><PanelLeft size={14} />사이즈 표</Button></div>;
  const canvas = <div className={styles.canvas} ref={canvasRef}><div className={styles.canvasCaption}><span><span className={styles.dot} />고객에게 보이는 상세페이지</span><span>{mobile ? "모바일 375px" : "PC 화면"}</span></div><div className={`${styles.paper} ${mobile ? styles.mobilePaper : ""}`}>{blocks.map((block, index) => <div className={styles.canvasBlock} data-block-id={block.id} tabIndex={-1} data-selected={active?.id === block.id} key={block.id} onClick={() => setSelected(block.id)}><div className={styles.blockSelection}><span>{String(index + 1).padStart(2, "0")} {labels[block.kind]}</span><button aria-label={`${labels[block.kind]} 블록 삭제`} onClick={(event) => { event.stopPropagation(); commit(blocks.filter((item) => item.id !== block.id)); }}><Trash2 size={12} /></button></div><BlockContent block={block} /></div>)}{!blocks.length && <div className={styles.empty}>템플릿을 선택하거나 블록을 추가해 주세요.</div>}</div><button className={styles.canvasAdd} onClick={() => add("text")}><Plus size={15} />블록 추가하기</button></div>;
  const toolbar = <div className={styles.toolbar}><div className={styles.toolbarLeft}><LayoutTemplate size={17} /><strong>상세페이지 편집</strong><span className={styles.count}>{blocks.length}개 블록</span></div><div className={styles.toolbarRight}><Button size="sm" variant="ghost" aria-label="되돌리기" disabled={!history.length} onClick={undo}><Undo2 size={16} /></Button><Button size="sm" variant="ghost" aria-label="다시 실행" disabled={!future.length} onClick={redo}><Redo2 size={16} /></Button><span className={styles.separator} /><button className={styles.device} data-active={!mobile} aria-label="PC 편집 폭" onClick={() => setMobile(false)}><Monitor size={16} /></button><button className={styles.device} data-active={mobile} aria-label="모바일 편집 폭" onClick={() => setMobile(true)}><Smartphone size={16} /></button><span className={styles.separator} /><Button size="sm" variant="ghost" onClick={() => openUpload()}><Upload size={14} />파일 가져오기</Button></div></div>;

  return <div className={styles.shell} ref={editorRef}><SellerConsoleLayoutV2 marketName="오브제 스튜디오"><div className={styles.breadcrumb}>상품 관리 <ChevronRight size={12} /> 상품 수정 <ChevronRight size={12} /><span>상세페이지</span></div><div className={styles.pageHeading}><div><div className={styles.titleLine}><h1>상품 수정</h1><span className={styles.prototypeBadge}>PC 화면 시안</span></div></div><div className={styles.headingActions}><span className={styles.draftStatus}><span className={hasUnappliedChanges || hasUnsavedChanges ? styles.dot : styles.greenDot} />{status}</span><Button variant="secondary" onClick={() => setPreview(true)}><Eye size={16} />미리보기</Button><Button onClick={parentView ? saveProduct : apply}>{parentView ? <Save size={15} /> : <Check size={16} />}{parentView ? "변경 저장" : "상품에 적용"}</Button></div></div>
    <div className={styles.productStrip}><Image src={shirt} alt="내추럴 린넨 셔츠" className={styles.productThumb} sizes="44px" /><div><strong>내추럴 린넨 셔츠</strong><p>상품번호 10284 <span>·</span> 상의 / 셔츠</p></div><span className={styles.selling}>판매중</span><div className={styles.productPrice}><small>판매가</small><strong>39,000원</strong></div></div>
    <div className={styles.productTabs}><button data-active={parentView} onClick={openBasicInfo}>기본 정보</button><button data-active={!parentView} onClick={() => setParentView(false)}>상세페이지 <span>편집</span></button><button onClick={() => setToast("이번 시안에서는 상세페이지 편집 흐름을 확인할 수 있습니다.")}>옵션·재고</button><button onClick={() => setToast("배송 설정은 기존 상품 수정 화면을 사용합니다.")}>배송 정보</button><p>변경사항은 상품 저장 후 고객에게 반영됩니다.</p></div>
    {parentView ? <div className={styles.parentLayout}><section className={styles.parentForm}><h2>상품 기본 정보</h2><Field label="상품명"><Input defaultValue="내추럴 린넨 셔츠" /></Field><div className="grid grid-cols-2 gap-4"><Field label="판매가"><Input defaultValue="39,000" /></Field><Field label="판매 상태"><Select defaultValue="판매중"><option>판매중</option><option>숨김</option></Select></Field></div><Field label="요약 설명"><Textarea defaultValue="산뜻한 린넨과 부드러운 코튼, 매일 입기 좋은 여유로운 핏." /></Field><div className={styles.appliedCard}><Check size={18} /><div><strong>{hasUnsavedChanges ? "상세페이지가 적용되었습니다" : saved ? "저장한 상세페이지입니다" : "현재 상품의 상세페이지입니다"}</strong><p>{appliedBlocks.length}개 블록 · 이미지 {appliedBlocks.filter((block) => block.kind === "image").length}개 · {hasUnsavedChanges ? "저장 전" : "저장 대상"}</p></div><Button variant="secondary" size="sm" onClick={() => setParentView(false)}>다시 편집</Button></div><p className={styles.helper}>오른쪽 위 ‘변경 저장’을 누르면 상품 수정이 완료됩니다.</p></section><div className={styles.parentPreview}><div className={styles.panelHeading}><strong>상품에 반영할 상세페이지</strong><Eye size={15} /></div><div className={styles.paper}>{appliedBlocks.map((block) => <BlockContent block={block} key={block.id} />)}</div></div></div> : <>
      {variant === "A" && <VariantA toolbar={toolbar} library={library} canvas={canvas} inspector={inspector} additions={additions} />}
      {variant === "B" && <VariantB blocks={blocks} selected={selected} onSelect={select} inspector={inspector} additions={additions} onTemplates={() => setDialog("templates")} mobile={mobile} onMobile={setMobile} />}
      {variant === "C" && <VariantC step={step} onStep={setStep} gallery={templateCards(true)} canvas={canvas} inspector={inspector} additions={additions} blocks={blocks} onApply={apply} />}
      <div className={styles.editorFooter}><span><Check size={13} />기본 정보와 옵션은 그대로 유지됩니다.</span><span>샘플 상품 · 변경 내용은 이 화면에서만 유지됩니다.</span></div>
    </>}
    <PrototypeSwitcher variants={variants} />
    {toast && <div className={styles.toast} role="status"><Check size={17} />{toast}<button aria-label="알림 닫기" onClick={() => setToast("")}><X size={15} /></button></div>}
    <Dialog open={preview} onClose={() => setPreview(false)} title="고객 화면 미리보기" description={parentView ? "상품에 적용한 상세페이지를 기기별로 확인해 보세요." : "현재 작성한 상세페이지를 기기별로 확인해 보세요."} className="max-w-[1000px]"><div className={styles.previewToolbar}><div className={styles.alignControls}><button data-active={!mobile} onClick={() => setMobile(false)}><Monitor size={15} />PC</button><button data-active={mobile} onClick={() => setMobile(true)}><Smartphone size={15} />모바일</button></div><span>{parentView ? "상품에 적용한 내용" : "편집 중인 내용 · 저장 전"}</span>{!parentView && <Button size="sm" onClick={apply}>상품에 적용 <ArrowRight size={13} /></Button>}</div><div className={styles.previewStage}><div className={`${styles.previewPaper} ${mobile ? styles.mobilePaper : ""}`}>{previewBlocks.map((block) => <BlockContent key={block.id} block={block} />)}</div></div></Dialog>
    <Dialog open={dialog === "leave-editor"} onClose={() => setDialog(null)} title="편집한 내용을 상품에 적용할까요?" description="아직 적용하지 않은 상세페이지 변경사항이 있어요. 적용한 내용만 상품 저장에 포함됩니다.">
      <p className={styles.helper}>계속 편집하면 작성 중인 내용이 그대로 유지됩니다.</p>
      <div className={styles.dialogFooter}><Button variant="secondary" onClick={() => setDialog(null)}>계속 편집</Button><Button onClick={apply}>적용하고 이동</Button></div>
    </Dialog>
    <Dialog open={dialog === "save-template"} onClose={() => setDialog(null)} title={editingTemplate ? "내 템플릿 수정" : "내 템플릿으로 저장"} description="현재 구성을 다른 상품에서도 사용할 수 있어요."><Field label="템플릿 이름"><Input placeholder="예: 우리 마켓 셔츠 상세 양식" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></Field><div className={styles.templateSummary}><LayoutTemplate size={20} /><div><strong>{blocks.length}개 블록으로 구성된 상세페이지</strong><p>현재 문구와 이미지가 함께 저장됩니다.</p></div></div><p className={styles.helper}>체험용 저장으로, 새로고침하면 초기화됩니다.</p><div className={styles.dialogFooter}><Button variant="secondary" onClick={() => setDialog(null)}>취소</Button><Button disabled={!templateName.trim()} onClick={saveTemplate}>{editingTemplate ? "템플릿 수정" : "템플릿 저장"}</Button></div></Dialog>
    <Dialog open={Boolean(pendingTemplate)} onClose={() => setPendingTemplate(undefined)} title={`${pendingTemplate?.name ?? ""} 적용`} description="현재 작성한 상세페이지에 어떻게 적용할까요?"><div className={styles.templateSummary}><LayoutTemplate size={22} /><div><strong>{pendingTemplate?.blocks.length}개 블록</strong><p>적용 후에도 문구와 이미지를 자유롭게 바꿀 수 있어요.</p></div></div><div className={styles.dialogFooter}><Button variant="secondary" onClick={() => pendingTemplate && applyTemplate(pendingTemplate, true)}>끝에 추가</Button><Button onClick={() => pendingTemplate && applyTemplate(pendingTemplate)}>전체 교체</Button></div><p className={styles.helper}>전체 교체 후에도 되돌리기로 이전 구성을 복원할 수 있어요.</p></Dialog>
    <Dialog open={dialog === "templates"} onClose={() => setDialog(null)} title="템플릿 선택" className="max-w-[880px]">{templateCards(true)}</Dialog>
    <Dialog open={dialog === "upload"} onClose={() => { setDialog(null); setImportText(""); setReplacingImageID(undefined); }} title={replacingImageID ? "이미지 교체" : "외부 파일 가져오기"} description={replacingImageID ? "선택한 블록의 위치와 설명을 유지한 채 사진만 바꿉니다." : "다른 서비스에서 만든 이미지나 HTML을 사용해 보세요."} className="max-w-xl"><label className={styles.dropzone} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void readFiles(event.dataTransfer.files); }}><span><Upload size={25} /></span><strong>파일을 여기에 놓거나 선택해 주세요</strong><p>{replacingImageID ? "JPG · PNG · WebP · GIF · 한 장 선택" : "JPG · PNG · WebP · GIF · HTML"}</p><em>파일 선택</em><input aria-label={replacingImageID ? "교체할 이미지 선택" : "상세 파일 선택"} type="file" accept={replacingImageID ? "image/jpeg,image/png,image/webp,image/gif" : "image/jpeg,image/png,image/webp,image/gif,.html,.htm"} multiple={!replacingImageID} onChange={(event) => { void readFiles(event.target.files); event.target.value = ""; }} /></label><div className={styles.uploadNotes}><p><Check size={13} />{replacingImageID ? "선택한 이미지 한 장만 바뀌며, 되돌리기로 복원할 수 있어요." : "여러 장의 이미지를 순서대로 추가할 수 있어요."}</p><p><Check size={13} />GIF는 움직이는 원본 그대로 보여요.</p><p><Check size={13} />파일은 이 브라우저에서만 사용하며 서버로 보내지 않아요.</p></div>{importText && <div className={styles.importResult}><strong><FileCode2 size={16} />{importName}</strong><Textarea aria-label="가져온 HTML" value={importText} onChange={(event) => setImportText(event.target.value)} className="mt-3 font-mono text-xs" /><p>체험 화면에서는 텍스트만 추출합니다. HTML 디자인 보존은 실제 구현 범위입니다.</p><Button size="sm" onClick={() => { const body = new DOMParser().parseFromString(importText, "text/html"); body.querySelectorAll("script,style").forEach((node) => node.remove()); const block: Block = { id: crypto.randomUUID(), kind: "text", title: importName, body: body.body.textContent?.trim() ?? "", align: "left" }; commit([...blocks, block]); selectNewBlock(block.id); setImportText(""); setDialog(null); }}>텍스트 블록으로 추가</Button></div>}</Dialog>
    <Dialog open={dialog === "video"} onClose={() => setDialog(null)} title="동영상 추가" description="YouTube 링크를 붙여넣으면 영상 블록을 추가할 수 있어요."><Field label="영상 링크"><Input aria-label="YouTube 영상 링크" value={videoURL} onChange={(event) => setVideoURL(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></Field><div className={styles.videoHint}><Video size={24} /><strong>영상으로 전하는 상품의 디테일</strong><p>착용감과 움직임을 더 생생하게 보여 주세요.</p></div><p className={styles.helper}>체험에서는 영상 자리만 표시합니다. 실제 재생과 직접 파일 업로드는 구현 후 지원합니다.</p><div className={styles.dialogFooter}><Button variant="secondary" onClick={() => setDialog(null)}>취소</Button><Button disabled={!videoURL.trim()} onClick={insertVideo}>영상 추가</Button></div></Dialog>
  </SellerConsoleLayoutV2></div>;
}

function VariantA({ toolbar, library, canvas, inspector, additions }: { toolbar: ReactNode; library: ReactNode; canvas: ReactNode; inspector: ReactNode; additions: ReactNode }) { return <section className={styles.workspace}>{toolbar}<div className={styles.workGrid}>{library}<div className={styles.canvasColumn}>{additions}{canvas}</div>{inspector}</div></section>; }

function VariantB({ blocks, selected, onSelect, inspector, additions, onTemplates, mobile, onMobile }: { blocks: Block[]; selected: string; onSelect: (id: string) => void; inspector: ReactNode; additions: ReactNode; onTemplates: () => void; mobile: boolean; onMobile: (value: boolean) => void }) {
  return <div className={styles.splitLayout}><section className={styles.formEditor}><div className={styles.toolbar}><strong>내용 편집</strong><Button variant="secondary" size="sm" onClick={onTemplates}><LayoutTemplate size={14} />템플릿 선택</Button></div>{additions}<div className={styles.accordions}>{blocks.map((block, index) => <div key={block.id} className={styles.accordion} data-block-id={block.id} tabIndex={-1} data-active={selected === block.id}><button className={styles.accordionTitle} onClick={() => onSelect(block.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{labels[block.kind]}</strong><p>{block.title.replaceAll("\n", " ")}</p><ChevronRight size={15} /></button>{selected === block.id && inspector}</div>)}</div></section><section className={styles.livePreview}><div className={styles.toolbar}><div className={styles.toolbarLeft}><span className={styles.greenDot} /><strong>실시간 미리보기</strong></div><div className={styles.alignControls}><button data-active={!mobile} onClick={() => onMobile(false)}><Monitor size={14} />PC</button><button data-active={mobile} onClick={() => onMobile(true)}><Smartphone size={14} />모바일</button></div></div><div className={styles.splitStage}><div className={`${styles.paper} ${mobile ? styles.mobilePaper : ""}`}>{blocks.map((block) => <BlockContent key={block.id} block={block} />)}</div></div></section></div>;
}

function VariantC({ step, onStep, gallery, canvas, inspector, additions, blocks, onApply }: { step: number; onStep: (step: number) => void; gallery: ReactNode; canvas: ReactNode; inspector: ReactNode; additions: ReactNode; blocks: Block[]; onApply: () => void }) {
  return <section className={styles.guided}><div className={styles.steps}>{["템플릿 선택", "내용 채우기", "확인하고 적용"].map((name, index) => <button key={name} data-active={step === index + 1} onClick={() => onStep(index + 1)}><span>{step > index + 1 ? <Check size={15} /> : `0${index + 1}`}</span>{name}{index < 2 && <ChevronRight size={16} />}</button>)}</div>{step === 1 ? <div className={styles.chooseTemplate}><span className={styles.stepEyebrow}>STEP 01</span><h2>어떤 이야기로 시작할까요?</h2><p>상품에 어울리는 구성을 골라 주세요. 모든 내용은 나중에 바꿀 수 있어요.</p>{gallery}<button className={styles.startBlank} onClick={() => onStep(2)}>현재 작성한 내용으로 계속하기 <ArrowRight size={15} /></button></div> : step === 2 ? <><div className={styles.guidedEditor}><div>{additions}{canvas}</div>{inspector}</div><div className={styles.stepFooter}><Button variant="secondary" onClick={() => onStep(1)}><ArrowLeft size={14} />템플릿 선택</Button><Button onClick={() => onStep(3)}>미리보기로 확인 <ArrowRight size={14} /></Button></div></> : <div className={styles.guidedReview}><div><span className={styles.stepEyebrow}>STEP 03</span><h2>이제 고객을 만날 준비가 됐어요</h2><p>상세페이지를 마지막으로 확인해 주세요.</p><div className={styles.reviewChecks}>{[`${blocks.length}개의 블록으로 완성한 상세페이지`, "상품 기본 정보와 옵션 유지", "상품에 적용한 뒤 변경 저장으로 마무리"].map((text) => <p key={text}><Check size={16} />{text}</p>)}</div><Button onClick={onApply}>상품에 적용 <ArrowRight size={15} /></Button></div><div className={styles.guidedReviewPaper}>{blocks.map((block) => <BlockContent key={block.id} block={block} />)}</div></div>}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}</label>; }
function BlockContent({ block }: { block: Block }) {
  if (block.kind === "image") return <figure className={styles.detailImage}><Image unoptimized src={block.src ?? shirt.src} width={1086} height={1448} alt={block.title} className={styles.shirtImage} /><figcaption>{block.body}</figcaption></figure>;
  if (block.kind === "size") return <section className={styles.detailText}><small>SIZE GUIDE</small><h3>{block.title}</h3><table className={styles.sizeTable}><thead><tr>{["사이즈", "어깨", "가슴", "소매", "총장"].map((cell) => <th key={cell}>{cell}</th>)}</tr></thead><tbody><tr>{["FREE", "48", "56", "58", "69"].map((cell) => <td key={cell}>{cell}</td>)}</tr></tbody></table><p>{block.body}</p></section>;
  if (block.kind === "video") return <section className={styles.detailText}><h3>{block.title}</h3><div className={styles.videoPlaceholder}><span><Video size={28} /></span><strong>영상 미리보기 영역</strong><p>YouTube · {block.body}</p><small>PC 화면 시안 · 재생 미연결</small></div></section>;
  return <section className={block.kind === "hero" ? styles.detailHero : block.kind === "notice" ? styles.detailNotice : styles.detailText} style={{ textAlign: block.align ?? "center" }}>{block.eyebrow && <small>{block.eyebrow}</small>}<h3>{block.title}</h3><p>{block.body}</p>{block.kind === "hero" && <div className={styles.heroLine} />}</section>;
}
