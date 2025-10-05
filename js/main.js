// main.vanilla.js（クリック統一版：そのままコピペでOK）
(() => {
  /*** ========= ヘルパ ========= ***/
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // スライドアニメ（max-height方式を WAAPI に置き換え）
  const slide = {
    down(el, dur = 250) {
      el.removeAttribute("hidden");
      el.style.display = "block";

      // 現在の高さ（0またはスクロール可能な高さ）を取得
      const startH =
        el.hasAttribute("hidden") || el.style.display === "none"
          ? 0
          : el.scrollHeight;
      const targetH = el.scrollHeight;

      // hidden属性やdisplayを外す
      el.removeAttribute("hidden");
      el.style.display = "block";

      // WAAPIでアニメーションを定義
      const animation = el.animate(
        [
          { maxHeight: `${startH}px`, overflow: "hidden" },
          { maxHeight: `${targetH}px`, overflow: "hidden" },
        ],
        {
          duration: dur,
          easing: "ease",
        }
      );

      animation.onfinish = () => {
        // アニメーション完了後、maxHeightを'none'に戻す
        el.style.maxHeight = "none";
        el.style.overflow = "";
      };
    },

    up(el, dur = 250) {
      const startH = el.scrollHeight;

      // WAAPIでアニメーションを定義
      const animation = el.animate(
        [
          { maxHeight: `${startH}px`, overflow: "hidden" },
          { maxHeight: "0px", overflow: "hidden" },
        ],
        {
          duration: dur,
          easing: "ease",
        }
      );

      animation.onfinish = () => {
        // アニメーション完了後、要素を非表示にする
        el.style.maxHeight = "0px"; // 念のため0を保持
        el.setAttribute("hidden", "");
        el.style.display = "none";
        el.style.overflow = "";
      };
    },

    toggle(el, dur = 250) {
      const cs = getComputedStyle(el);
      const hidden =
        el.hasAttribute("hidden") ||
        cs.display === "none" ||
        cs.maxHeight === "0px";
      hidden ? this.down(el, dur) : this.up(el, dur);
    },
  };
  const containsFocus = (el) => el && el.contains(document.activeElement);

  /*** ========= 1) ハンバーガー ========= ***/
  function initHamburger() {
    const btn = $(".js-btn");
    const nav = $(".l-header__nav");
    const line = $(".c-hamburger__line");
    if (!btn || !nav || !line) return;

    const closeHamburger = () => {
      btn.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
      line.classList.remove("open");
    };

    // ARIA補強
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "global-nav");
    nav.id ||= "global-nav";

    btn.addEventListener("click", () => {
      const opened = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!opened));
      nav.classList.toggle("open");
      line.classList.toggle("open");
      if (!opened) {
        const first = nav.querySelector(
          'a, button, [tabindex]:not([tabindex="-1"])'
        );
        first && first.focus();
      } else {
        btn.focus();
      }
    });

    // ESCで閉じる
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Escape") return;
        if (btn.getAttribute("aria-expanded") === "true") btn.click();
      },
      { passive: true }
    );

    // メニュー内リンククリックで閉じる（メガメニューボタンは除外）
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      if (
        a.classList.contains("c-mega-menu__button") ||
        a.getAttribute("href") === "#"
      )
        return;
      if (
        btn.getAttribute("aria-expanded") === "true" ||
        nav.classList.contains("open")
      ) {
        closeHamburger();
      }
    });
  }

  /*** ========= 2) 簡易トグル (.c-toggle__header → 次要素) ========= ***/
  function initSimpleToggle() {
    $$(".c-toggle__header").forEach((hdr, i) => {
      const panel = hdr.nextElementSibling;
      if (!panel) return;

      const pid = panel.id || `toggle-panel-${i + 1}`;
      panel.id = pid;
      hdr.setAttribute("aria-controls", pid);
      hdr.setAttribute("aria-expanded", "false");
      panel.setAttribute("hidden", "");

      hdr.addEventListener("click", () => {
        const open = hdr.getAttribute("aria-expanded") === "true";
        hdr.classList.toggle("selected");
        hdr.setAttribute("aria-expanded", String(!open));
        slide.toggle(panel, 200);
      });
    });
  }

  /*** ========= 3) アコーディオン [data-accordion] ========= ***/
  function initAccordion() {
    const groups = $$("[data-accordion]");
    if (!groups.length) return;

    groups.forEach((acc, gIdx) => {
      const items = $$(".c-accordion__item", acc);
      items.forEach((item, i) => {
        const btn = $(".c-accordion__trigger", item);
        const panel = $(".c-accordion__panel", item);
        if (!btn || !panel) return;

        const pid = panel.id || `acc-${gIdx + 1}-panel-${i + 1}`;
        panel.id = pid;
        btn.setAttribute("aria-controls", pid);

        const expanded = btn.getAttribute("aria-expanded") === "true";
        if (expanded) {
          panel.style.maxHeight = "none";
        } else {
          panel.setAttribute("hidden", "");
          panel.style.maxHeight = "0px";
          panel.style.overflow = "hidden";
          btn.setAttribute("aria-expanded", "false");
        }

        btn.addEventListener("click", () => {
          const isOpen = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", String(!isOpen));
          isOpen ? slide.up(panel, 200) : slide.down(panel, 200);
        });
      });

      window.addEventListener(
        "resize",
        () => {
          $$('.c-accordion__trigger[aria-expanded="true"]', acc).forEach(
            (b) => {
              const p = b
                .closest(".c-accordion__item")
                ?.querySelector(".c-accordion__panel");
              if (p) p.style.maxHeight = "none";
            }
          );
        },
        { passive: true }
      );
    });
  }

  /*** ========= 4) メガメニュー（SP/PC共通：クリックで開閉） ========= ***/
  function initMegaMenu() {
    const items = $$(".l-header__menu > .c-mega-menu");
    if (!items.length) return;

    const menuRoot = $(".l-header__menu");

    function ensureButton(el) {
      if (el.tagName.toLowerCase() === "button") return el;
      el.addEventListener("click", (e) => e.preventDefault()); // <a href="#"> の遷移抑止
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      return el;
    }

    function closeItem(item) {
      const btn = $(".c-mega-menu__button", item);
      const wrap = $(".c-mega-menu__wrap", item);
      if (!btn || !wrap) return;
      if (btn.getAttribute("aria-expanded") === "true") {
        btn.classList.remove("open"); // 矢印回転等に利用
        btn.setAttribute("aria-expanded", "false");
        slide.up(wrap, 180);
        document.documentElement.style.removeProperty("--dim-main");
      }
    }
    function openItem(item) {
      const btn = $(".c-mega-menu__button", item);
      const wrap = $(".c-mega-menu__wrap", item);
      if (!btn || !wrap) return;
      if (btn.getAttribute("aria-expanded") !== "true") {
        btn.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        slide.down(wrap, 180);
        document.documentElement.style.setProperty("--dim-main", "0.4");
      }
    }
    function closeAll(except = null) {
      items.forEach((it) => {
        if (it !== except) closeItem(it);
      });
    }

    // 初期属性
    items.forEach((item, idx) => {
      const btn = ensureButton($(".c-mega-menu__button", item));
      const wrap = $(".c-mega-menu__wrap", item);
      if (!btn || !wrap) return;

      const id = wrap.id || `mega-${idx + 1}`;
      wrap.id = id;
      btn.setAttribute("aria-controls", id);
      btn.setAttribute("aria-expanded", "false");
      wrap.setAttribute("hidden", "");
    });

    // クリックで開閉（イベント委譲）
    menuRoot.addEventListener("click", (e) => {
      const btn = e.target.closest(".c-mega-menu__button");
      if (!btn) return;
      const item = btn.closest(".c-mega-menu");
      if (!item) return;

      const isOpen = btn.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeItem(item);
      } else {
        closeAll(item);
        openItem(item);
        // 初回オープン時、パネル内の最初のフォーカス可能要素へ（任意）
        const first = item.querySelector(
          '.c-mega-menu__wrap a, .c-mega-menu__wrap button, .c-mega-menu__wrap [tabindex]:not([tabindex="-1"])'
        );
        first && first.focus();
      }
    });

    // キーボード操作（Enter/Spaceでトグル）
    menuRoot.addEventListener("keydown", (e) => {
      const btn = e.target.closest(".c-mega-menu__button");
      if (!btn) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        btn.click();
      }
    });

    // 外側クリックで閉じる
    document.addEventListener("click", (e) => {
      const inside = e.target.closest(".c-mega-menu");
      if (inside) return;
      closeAll();
    });

    // ESCで閉じる
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") closeAll();
      },
      { passive: true }
    );

    // フォーカスがメニュー外へ出たら閉じる（タブ移動対応）
    items.forEach((item) => {
      item.addEventListener("focusout", (e) => {
        const toEl = e.relatedTarget;
        if (toEl && item.contains(toEl)) return; // 同一メニュー内の移動は閉じない
        // 少し遅らせて外部フォーカスへ移ったことを確定
        setTimeout(() => {
          if (!containsFocus(item)) closeItem(item);
        }, 0);
      });
    });
  }

  /*** ========= 初期化 ========= ***/
  function init() {
    initHamburger();
    initSimpleToggle();
    initAccordion();
    initMegaMenu();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
