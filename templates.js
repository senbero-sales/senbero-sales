// 飲食店開業の一般的なタスクテンプレート
// offset = オープン日の何日前が期限の目安か（0 = オープン当日、マイナス = オープン後）
// 期限はあくまで目安です。届出の期限は自治体・管轄によって異なるため、必ず確認してください。
window.KAIGYO_TEMPLATE = [
  // 物件・内装
  { cat: 'property', offset: 180, title: '開業コンセプト・事業計画書の作成' },
  { cat: 'property', offset: 150, title: '資金計画の作成・融資の申し込み', memo: '日本政策金融公庫、自治体の制度融資など' },
  { cat: 'property', offset: 150, title: '物件探し・内見' },
  { cat: 'property', offset: 120, title: '物件の契約', memo: '居抜きの場合は設備の状態・譲渡範囲・リース残債を確認' },
  { cat: 'property', offset: 110, title: '内装業者の選定・相見積もり' },
  { cat: 'property', offset: 100, title: '内装・厨房レイアウトの設計', memo: 'シンクの数、手洗い器など保健所の施設基準を確認' },
  { cat: 'property', offset: 75, title: '内装工事の着工' },
  { cat: 'property', offset: 30, title: '電気・ガス・水道の容量確認と開栓手続き' },
  { cat: 'property', offset: 30, title: '看板・外観の制作' },
  { cat: 'property', offset: 20, title: '内装工事の完了・引き渡し' },
  { cat: 'property', offset: 20, title: 'インターネット回線・電話の開通' },

  // 厨房機器
  { cat: 'kitchen', offset: 100, title: '必要な厨房機器リストの作成' },
  { cat: 'kitchen', offset: 90, title: '厨房機器の見積もり（新品・中古・リースの比較）' },
  { cat: 'kitchen', offset: 60, title: '厨房機器の発注' },
  { cat: 'kitchen', offset: 30, title: '食器・調理器具・備品の購入' },
  { cat: 'kitchen', offset: 30, title: 'POSレジ・キャッシュレス決済端末の導入' },
  { cat: 'kitchen', offset: 21, title: '厨房機器の搬入・設置' },
  { cat: 'kitchen', offset: 18, title: '機器の動作確認' },
  { cat: 'kitchen', offset: 14, title: '消火器の設置' },

  // 許認可
  { cat: 'permit', offset: 90, title: '保健所への事前相談（図面を持参）' },
  { cat: 'permit', offset: 60, title: '食品衛生責任者の資格取得' },
  { cat: 'permit', offset: 60, title: '防火管理者の資格取得', memo: '収容人数30人以上の場合に必要' },
  { cat: 'permit', offset: 21, title: '飲食店営業許可の申請（保健所）', memo: '工事完了の10日前ごろまでが目安。自治体により異なる' },
  { cat: 'permit', offset: 14, title: '防火対象物使用開始届（消防署）', memo: '使用開始の7日前までに提出' },
  { cat: 'permit', offset: 14, title: '深夜酒類提供飲食店営業開始届（警察署）', memo: '深夜0時以降に酒類を提供する場合。営業開始の10日前までに提出' },
  { cat: 'permit', offset: 10, title: '保健所の施設検査の立ち会い' },
  { cat: 'permit', offset: 7, title: '労働保険・社会保険の手続き', memo: '従業員を雇う場合' },
  { cat: 'permit', offset: 5, title: '営業許可証の受け取り・掲示' },
  { cat: 'permit', offset: -30, title: '開業届の提出（税務署）', memo: '開業から1か月以内' },
  { cat: 'permit', offset: -60, title: '青色申告承認申請書の提出（税務署）', memo: '開業から2か月以内' },

  // 仕入れ
  { cat: 'supply', offset: 60, title: '仕入れ先（食材・酒類）の選定' },
  { cat: 'supply', offset: 45, title: '仕入れ先との条件交渉・取引口座の開設' },
  { cat: 'supply', offset: 45, title: '酒類・飲料の取引契約（ビールサーバーなど）' },
  { cat: 'supply', offset: 21, title: '消耗品・包材の手配' },
  { cat: 'supply', offset: 10, title: '試運転用の初回発注' },
  { cat: 'supply', offset: 4, title: 'オープン用食材の発注' },

  // メニュー・原価
  { cat: 'menu', offset: 75, title: 'メニュー構成の決定' },
  { cat: 'menu', offset: 60, title: '試作・レシピ作成' },
  { cat: 'menu', offset: 45, title: '原価計算・販売価格の決定', memo: '目標原価率を決めて品目ごとに確認' },
  { cat: 'menu', offset: 30, title: 'レシピ・盛り付けのマニュアル化' },
  { cat: 'menu', offset: 25, title: 'アレルギー・原産地表示の確認' },
  { cat: 'menu', offset: 25, title: 'メニューブック・価格表の制作' },

  // 採用・研修
  { cat: 'staff', offset: 75, title: '必要人数・シフト体制の計画' },
  { cat: 'staff', offset: 60, title: '求人募集の開始' },
  { cat: 'staff', offset: 40, title: '面接・採用の決定' },
  { cat: 'staff', offset: 35, title: '雇用契約書・労働条件通知書の作成' },
  { cat: 'staff', offset: 30, title: '業務マニュアル・就業ルールの作成' },
  { cat: 'staff', offset: 14, title: '接客研修' },
  { cat: 'staff', offset: 14, title: '調理研修' },
  { cat: 'staff', offset: 10, title: '衛生管理研修（HACCPの考え方）' },

  // 販促
  { cat: 'promo', offset: 120, title: '店名・ロゴの決定' },
  { cat: 'promo', offset: 60, title: 'SNSアカウントの開設・開業準備の発信' },
  { cat: 'promo', offset: 30, title: 'Googleビジネスプロフィールの登録' },
  { cat: 'promo', offset: 30, title: 'グルメサイトへの掲載' },
  { cat: 'promo', offset: 30, title: 'ショップカード・チラシの制作' },
  { cat: 'promo', offset: 14, title: 'オープン告知・オープン特典の準備' },
  { cat: 'promo', offset: 7, title: '近隣へのあいさつ・チラシ配布' },

  // 試運転
  { cat: 'trial', offset: 21, title: 'HACCPに沿った衛生管理計画の作成' },
  { cat: 'trial', offset: 10, title: 'オペレーション（動線・提供時間）の確認' },
  { cat: 'trial', offset: 7, title: '営業の通しリハーサル' },
  { cat: 'trial', offset: 5, title: '釣り銭の準備・レジ締め手順の確認' },
  { cat: 'trial', offset: 3, title: 'プレオープン（知人・関係者を招待）' },
  { cat: 'trial', offset: 1, title: '最終清掃・備品チェック' },
  { cat: 'trial', offset: 0, title: 'グランドオープン' }
];
