import {
  BookOpen,
  CalendarDots,
  ChatCircleDots,
  DotsThreeCircle,
  House,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui";
import { ActionDock, DataRow, RouteHeader } from "@/components/app-shell/workspace-frame";
import { ShowcaseSample, ShowcaseSection } from "./showcase-frame";
import styles from "./showcase.module.css";

const NAV_ITEMS = [
  { icon: House, label: "ホーム", selected: true },
  { icon: BookOpen, label: "コース", selected: false },
  { icon: CalendarDots, label: "予定", selected: false },
  { icon: ChatCircleDots, label: "メッセージ", selected: false },
  { icon: DotsThreeCircle, label: "その他", selected: false },
] as const;

export function EditorialNativeShowcase() {
  return (
    <ShowcaseSection
      description="ラベル付きFocus rail、必要時だけ開く文脈パネル、広い学習キャンバス、意味のあるモーションを確認します。"
      eyebrow="01 / Editorial Native"
      title="Content, context, and meaningful motion"
    >
      <div className={styles.workspaceGrid}>
        <ShowcaseSample label="Page frame primitives">
          <div className={styles.frameSample}>
            <RouteHeader description="必要な文脈だけを残した学習キャンバス" eyebrow="COURSE / 04" metadata="12 items" title="研究方法入門" />
            <div>
              <DataRow index="01" metadata="教材 · 8分" state="完了" title="観察記録の読み方" />
              <DataRow index="02" metadata="課題 · 金曜 17:00" state="未完了" title="比較観察レポート" />
            </div>
            <ActionDock><span>すべての変更を保存済み</span><button type="button">次へ進む</button></ActionDock>
          </div>
        </ShowcaseSample>
        <ShowcaseSample label="Focus rail and context">
          <nav aria-label="ナビゲーション見本" className={styles.navDock}>
            <strong>next-moodle</strong>
            <span className={styles.navSearch}><MagnifyingGlass aria-hidden size={17} />移動・検索</span>
            {NAV_ITEMS.map(({ icon: Icon, label, selected }) => (
              <span data-selected={selected} key={label}>
                <Icon aria-hidden size={20} weight="regular" />
                {label}
              </span>
            ))}
            <small>STUDY INDEX</small>
            <span><BookOpen aria-hidden size={20} weight="regular" />研究方法入門</span>
            <span><BookOpen aria-hidden size={20} weight="regular" />データ演習</span>
          </nav>
        </ShowcaseSample>
        <ShowcaseSample label="Course activity row">
          <div className={styles.activityRowSample}>
            <span className={styles.rowIndex}>03</span>
            <span><strong>理解度チェック</strong><small>小テスト · 明日 17:00</small></span>
            <Badge tone="warning">未完了</Badge>
            <button type="button">開く</button>
          </div>
        </ShowcaseSample>
        <ShowcaseSample label="Responsive action hierarchy">
          <div className={styles.responsiveStack} data-testid="responsive-stack-specimen">
            <div>
              <strong>提出内容を確認</strong>
              <small>本文あり · ファイル2件 · 締切 金曜 17:00</small>
            </div>
            <span>保存済み</span>
            <div>
              <button type="button">下書きを保存</button>
              <button type="button">提出を確定</button>
            </div>
          </div>
        </ShowcaseSample>
        <ShowcaseSample label="Capability states">
          <div className={styles.capabilityRows}>
            <span><i data-state="available" />公式API</span>
            <span><i data-state="html" />HTMLから独自UI</span>
            <span><i data-state="unavailable" />API未許可</span>
          </div>
        </ShowcaseSample>
      </div>
      <div className={styles.motionStrip} aria-label="モーション意図">
        <span data-motion="drill-in"><strong>前進</strong><small>コース・活動・会話</small></span>
        <span data-motion="return"><strong>復帰</strong><small>親画面へ戻る</small></span>
        <span data-motion="switch"><strong>切替</strong><small>ナビ・タブ・絞り込み</small></span>
        <span data-motion="reveal"><strong>表示</strong><small>読み込み完了</small></span>
      </div>
      <div className={styles.screenGrid}>
        <ShowcaseSample label="Login workspace">
          <div className={styles.loginScreen}><section><span>接続先</span><strong>moodle.example.edu</strong><small>認証情報は保存しません</small></section><section><strong>認証情報</strong><i /><i /><button type="button">ログイン</button></section></div>
        </ShowcaseSample>
        <ShowcaseSample label="Dashboard ledger">
          <div className={styles.dashboardScreen}><header><strong>7日予定</strong><span>次の課題</span></header>{["今日 · 09:00", "明日 · 17:00", "金曜 · 13:00"].map((item) => <p key={item}>{item}<span>学習アクション</span></p>)}</div>
        </ShowcaseSample>
        <ShowcaseSample label="Quiz attempt">
          <div className={styles.quizScreen}><header><strong>問 1</strong><span>保存済み</span></header><p>観察条件として記録する項目を選んでください。</p><div className={styles.demoOption}><i />水温</div><div className={styles.demoOption}><i />雲量</div><footer><button type="button">回答を提出</button></footer></div>
        </ShowcaseSample>
        <ShowcaseSample label="Conversation workspace">
          <div className={styles.inboxScreen}><nav><strong>観察の質問</strong><span>実習グループ</span><span>担当者への連絡</span></nav><section><p><strong>参加者</strong><small>10:24</small></p><span>記録方法について確認します。</span><p><strong>自分</strong><small>10:28</small></p><span>水温と天候も記録します。</span></section></div>
        </ShowcaseSample>
        <ShowcaseSample label="Structured activity">
          <div className={styles.dashboardScreen}><header><strong>データベース</strong><span>12件</span></header><p>ラベル<span>海岸線A</span></p><p>観察内容<span>潮位と種数を記録</span></p><p>入力状態<span>保存可能</span></p></div>
        </ShowcaseSample>
        <ShowcaseSample label="Workshop phase">
          <div className={styles.dashboardScreen}><header><strong>ワークショップ</strong><span>提出フェーズ</span></header><p>自分の提出<span>下書き</span></p><p>相互評価<span>未開始</span></p><p>通信状態<span>保存済み</span></p></div>
        </ShowcaseSample>
        <ShowcaseSample label="Verified launch">
          <div className={styles.dashboardScreen}><header><strong>外部ツール</strong><span>公式API</span></header><p>起動方式<span>署名済みPOST</span></p><p>トークン<span>ブラウザへ非公開</span></p><p>状態<span>起動可能</span></p></div>
        </ShowcaseSample>
        <ShowcaseSample label="Questionnaire flow">
          <div className={styles.formScreen}><header><strong>フィールドワーク準備</strong><span>下書き保存可</span></header><div className={styles.demoField}><span>安全案内を確認しましたか</span><i data-control="radio" />はい</div><div className={styles.demoField}><span>準備した機材</span><i data-control="check" />ノート</div><footer><button type="button">下書き保存</button><button type="button">回答を確認</button></footer></div>
        </ShowcaseSample>
        <ShowcaseSample label="Teacher contact">
          <div className={styles.composeScreen}><header><span aria-hidden>A</span><div><strong>Aoi Mentor</strong><small>担当教員 · 研究方法入門</small></div></header><div className={styles.demoField}><span>件名</span><i /></div><div className={styles.demoField}><span>本文</span><i /><i /><i /></div><footer><span>宛先を再検証して送信</span><button type="button">メッセージを送信</button></footer></div>
        </ShowcaseSample>
      </div>
    </ShowcaseSection>
  );
}
