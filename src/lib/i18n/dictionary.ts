/**
 * EN/JA dictionary for every hardcoded UI string. User data (ticket titles,
 * comments, question prompts…) is NEVER translated - only chrome text.
 * Kept client-side: all pages that render chrome are client components.
 */

export const LANGS = ["en", "ja"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "dymticket_lang";

type Entry = { en: string; ja: string };

export const DICT = {
  /* nav / shell */
  "nav.projects": { en: "Projects", ja: "プロジェクト" },
  "nav.analytics": { en: "Analytics", ja: "アナリティクス" },
  "nav.knowledge": { en: "Knowledge", ja: "ナレッジ" },
  "nav.admin": { en: "Admin", ja: "管理者" },
  "nav.adminConsole": { en: "Admin console", ja: "管理コンソール" },
  "nav.signout": { en: "Sign out", ja: "サインアウト" },
  "nav.accountMenu": { en: "Open account menu", ja: "アカウントメニューを開く" },
  "nav.signedOut": { en: "Signed out.", ja: "サインアウトしました。" },
  "nav.signoutFail": { en: "Could not sign out. Try again.", ja: "サインアウトできませんでした。もう一度お試しください。" },

  /* auth */
  "auth.login": { en: "Sign in", ja: "サインイン" },
  "auth.register": { en: "Create account", ja: "アカウント作成" },
  "auth.email": { en: "Email", ja: "メールアドレス" },
  "auth.name": { en: "Name", ja: "名前" },
  "auth.password": { en: "Password", ja: "パスワード" },
  "auth.submitLogin": { en: "Sign in", ja: "サインイン" },
  "auth.submitRegister": { en: "Create account", ja: "作成する" },
  "auth.toRegister": { en: "New here? Create an account", ja: "はじめての方は新規登録へ" },
  "auth.toLogin": { en: "Already have an account? Sign in", ja: "アカウントをお持ちの方はサインイン" },
  "auth.welcomeTitle": { en: "Welcome back", ja: "おかえりなさい" },
  "auth.registerTitle": { en: "Join the workspace", ja: "ワークスペースに参加" },
  "auth.loginDesc": { en: "Sign in to manage tickets and client reviews.", ja: "サインインしてチケットとクライアントレビューを管理します。" },
  "auth.registerDesc": { en: "Create your account to start collaborating.", ja: "アカウントを作成してコラボレーションを始めましょう。" },
  "auth.tagline": { en: "Ticketing that keeps clients in the loop.", ja: "クライアントと情報を共有するチケット管理。" },
  "auth.loginFail": { en: "Could not sign in. Check your email and password.", ja: "サインインできません。メールアドレスとパスワードをご確認ください。" },
  "auth.registerFail": { en: "Could not create the account.", ja: "アカウントを作成できませんでした。" },
  "auth.registerPageTitle": { en: "Create your workspace account", ja: "ワークスペースアカウントを作成" },
  "auth.loginPageSub": { en: "Sign in to your projects, boards and reviews.", ja: "プロジェクト・ボード・レビューにサインインします。" },
  "auth.registerPageSub": { en: "Join your team and start shipping tickets together.", ja: "チームに参加して、一緒にチケットを進めましょう。" },
  "auth.fullName": { en: "Full name", ja: "氏名" },
  "auth.namePh": { en: "Ada Lovelace", ja: "例: 山田 太郎" },
  "auth.passwordPh": { en: "At least 8 characters", ja: "8文字以上で入力" },
  "auth.alreadyHave": { en: "Already have an account? ", ja: "アカウントをお持ちですか？ " },
  "auth.newToDym": { en: "New to DymTicket? ", ja: "DymTicketは初めてですか？ " },
  "auth.createAccountLink": { en: "Create an account", ja: "アカウントを作成" },
  "auth.toastRegistered": { en: "Welcome aboard!", ja: "ようこそ！" },
  "auth.toastWelcomed": { en: "Welcome back!", ja: "おかえりなさい！" },
  "auth.errorGeneric": { en: "Something went wrong.", ja: "問題が発生しました。" },
  "auth.highlight1": { en: "One board for tickets, reviews and decisions", ja: "チケット・レビュー・意思決定を1つのボードで" },
  "auth.highlight2": { en: "Clients approve work - nothing gets lost in email", ja: "クライアントがその場で承認 - メールでの見落としを防ぎます" },
  "auth.highlight3": { en: "Every change documented in a live activity timeline", ja: "すべての変更をアクティビティタイムラインに記録します" },
  "auth.quote": { en: "“Our clients finally see progress instead of asking for updates. Reviews happen in one click.”", ja: "「クライアントが進捗をその目で確認でき、レビューもワンクリックで完了するようになりました。」" },
  "auth.quoteAttrib": { en: "Studio team running design + delivery on DymTicket", ja: "DymTicketでデザインとデリバリーを回すスタジオチーム" },
  "auth.copyright": { en: "© {year} DymTicket - projects, tickets & reviews in one place.", ja: "© {year} DymTicket - プロジェクト・チケット・レビューをひとつに。" },

  /* projects view */
  "home.eyebrow": { en: "DymTicket workspace", ja: "DymTicket ワークスペース" },
  "home.titleClient": { en: "Projects you're reviewing", ja: "レビュー中のプロジェクト" },
  "home.titleTeam": { en: "Move work forward", ja: "仕事を前へ進める" },
  "home.subClient": { en: "Review deliverables, leave notes and approve - all from one board.", ja: "成果物の確認、コメント、承認をすべて一つのボードで。" },
  "home.subTeam": { en: "Board your team's tickets, keep clients in the loop, and never lose a decision.", ja: "チームのチケットを管理し、クライアントと共有し、決定事項を見失いません。" },
  "home.newProject": { en: "New project", ja: "新規プロジェクト" },
  "home.collaborators": { en: "collaborators", ja: "メンバー" },
  "home.project": { en: "project", ja: "プロジェクト" },
  "home.projects": { en: "projects", ja: "プロジェクト" },
  "home.emptyClientTitle": { en: "Waiting for your first project", ja: "最初のプロジェクトを待っています" },
  "home.createdAgo": { en: "Created", ja: "作成" },
  "home.members": { en: "members", ja: "メンバー" },
  "home.dialogTitle": { en: "Create a project", ja: "プロジェクトを作成" },
  "home.dialogName": { en: "Project name", ja: "プロジェクト名" },
  "home.dialogNamePh": { en: "e.g. Website Redesign", ja: "例: ウェブサイトリニューアル" },
  "home.dialogDesc": { en: "Description", ja: "説明" },
  "home.dialogDescPh": { en: "What is this project delivering?", ja: "このプロジェクトの成果物は何ですか?" },
  "home.create": { en: "Create project", ja: "プロジェクト作成" },
  "home.cancel": { en: "Cancel", ja: "キャンセル" },
  "home.createFail": { en: "Could not create the project.", ja: "プロジェクトを作成できませんでした。" },
  "home.projectCreated": { en: "Project created.", ja: "プロジェクトを作成しました。" },
  "home.emptyClientSub": { en: "Your organization hasn't added you to any projects yet. Once a project owner adds you, its board shows up right here.", ja: "まだプロジェクトに招待されていません。オーナーがあなたを追加すると、ここにボードが表示されます。" },
  "home.emptyTeamTitle": { en: "Board your first project", ja: "最初のプロジェクトを作成" },
  "home.emptyTeamSub": { en: "Projects come with a Kanban board - To Do, In Progress, In Review and Done - plus a client-ready review loop.", ja: "プロジェクトにはカンバンボード（ToDo・進行中・レビュー中・完了）とクライアント向けレビュー機能が付いています。" },
  "home.updatedAgo": { en: "Updated", ja: "更新" },
  "home.noDescription": { en: "No description yet.", ja: "説明はまだありません。" },
  "home.dialogDescSub": { en: "Boards start with To Do, In Progress, In Review and Done.", ja: "ボードには「ToDo・進行中・レビュー中・完了」のカラムが用意されています。" },
  "home.namePh": { en: "Website Redesign", ja: "ウェブサイトリニューアル" },
  "home.descPh": { en: "What is this project about?", ja: "このプロジェクトは何のためのものですか?" },

  /* board / columns */
  "board.newTicket": { en: "New ticket", ja: "新規チケット" },
  "board.tableView": { en: "Table", ja: "テーブル" },
  "board.boardView": { en: "Board", ja: "ボード" },
  "board.loadingBoard": { en: "Preparing your board…", ja: "ボードを準備中…" },
  "table.assignee": { en: "Assignee", ja: "担当者" },
  "table.priority": { en: "Priority", ja: "優先度" },
  "table.due": { en: "Due", ja: "期限" },
  "table.review": { en: "Review", ja: "レビュー" },
  "table.title": { en: "Ticket", ja: "チケット" },
  "table.status": { en: "Status", ja: "ステータス" },
  "table.updated": { en: "Updated", ja: "更新日時" },
  "board.listView": { en: "List", ja: "リスト" },
  "board.viewMode": { en: "View mode", ja: "表示モード" },
  "board.members": { en: "Members", ja: "メンバー" },
  "board.emptyColumn": { en: "Nothing here yet", ja: "まだ何もありません" },
  "board.addTicketTo": { en: "Add ticket to {column}", ja: "{column} にチケットを追加" },
  "board.moveFail": { en: "Could not move tickets.", ja: "チケットを移動できませんでした。" },
  "board.allAssignees": { en: "All assignees", ja: "すべての担当者" },
  "board.unknownUser": { en: "Unknown", ja: "不明" },
  "board.ticketCount": { en: "{n} tickets", ja: "チケット{n}件" },
  "board.filterAssignee": { en: "Filter by assignee", ja: "担当者で絞り込み" },
  "board.noTickets": { en: "No tickets match the current filter.", ja: "条件に一致するチケットはありません。" },


  /* ticket modal */
  "ticket.editTitle": { en: "Edit ticket", ja: "チケットを編集" },
  "ticket.newTitle": { en: "New ticket", ja: "新規チケット" },
  "ticket.fieldTitle": { en: "Title", ja: "タイトル" },
  "ticket.fieldTitlePh": { en: "Implement onboarding screen", ja: "オンボーディング画面を実装" },
  "ticket.fieldDesc": { en: "Description", ja: "説明" },
  "ticket.fieldDescPh": { en: "Describe the work, acceptance criteria, links to designs…", ja: "作業内容、完了条件、デザインへのリンクなどを記載…" },
  "ticket.fieldColumn": { en: "Column", ja: "カラム" },
  "ticket.fieldAssignee": { en: "Assignee", ja: "担当者" },
  "ticket.unassigned": { en: "Unassigned", ja: "未割り当て" },
  "ticket.fieldPriority": { en: "Priority", ja: "優先度" },
  "ticket.fieldDue": { en: "Due date", ja: "期限" },
  "ticket.attachments": { en: "Attachments", ja: "添付ファイル" },
  "ticket.saveChanges": { en: "Save changes", ja: "変更を保存" },
  "ticket.createTicket": { en: "Create ticket", ja: "チケットを作成" },
  "ticket.delete": { en: "Delete", ja: "削除" },
  "ticket.deleteConfirm": { en: "Delete ticket", ja: "チケットを削除" },
  "ticket.deleteQuote": { en: "? This cannot be undone.", ja: "？この操作は取り消せません。" },
  "ticket.updatedAgo": { en: "Updated", ja: "更新" },
  "ticket.activity": { en: "Activity", ja: "アクティビティ" },
  "ticket.commentPh": { en: "Write a comment…", ja: "コメントを書く…" },
  "ticket.send": { en: "Send comment", ja: "コメントを送信" },
  "ticket.titleShort": { en: "Give the ticket a title of at least 3 characters.", ja: "タイトルは3文字以上入力してください。" },
  "ticket.saveFail": { en: "Save failed.", ja: "保存に失敗しました。" },
  "ticket.updated": { en: "Ticket updated.", ja: "チケットを更新しました。" },
  "ticket.created": { en: "Ticket created.", ja: "チケットを作成しました。" },
  "ticket.deleted": { en: "Ticket deleted.", ja: "チケットを削除しました。" },
  "ticket.deleteFail": { en: "Delete failed.", ja: "削除に失敗しました。" },
  "ticket.commentFail": { en: "Comment failed.", ja: "コメントに失敗しました。" },

  /* review panel */
  "review.title": { en: "Client review", ja: "クライアントレビュー" },
  "review.approved": { en: "Approved", ja: "承認済み" },
  "review.under_review": { en: "Under review", ja: "レビュー中" },
  "review.changes_requested": { en: "Changes requested", ja: "修正依頼" },
  "review.approve": { en: "Approve", ja: "承認" },
  "review.underReview": { en: "Under review", ja: "レビュー中にする" },
  "review.requestChanges": { en: "Request changes", ja: "修正を依頼" },
  "review.note": { en: "Note (required for change requests)", ja: "メモ（修正依頼には必須）" },
  "review.notePh": { en: "Explain what should change…", ja: "変更したい点を記載…" },
  "review.submit": { en: "Submit review", ja: "レビューを送信" },
  "review.reviewedBy": { en: "Reviewed by", ja: "レビュー担当" },
  "review.requiresAnswers": { en: "Some required questions are still unanswered.", ja: "未回答の必須質問があります。" },
  "review.saved": { en: "Review submitted.", ja: "レビューを送信しました。" },
  "review.approveHint": { en: "Marks the work accepted and moves it to Done.", ja: "成果物を承認し、完了カラムへ移動します。" },
  "review.underReviewHint": { en: "Keeps the ticket in its current stage.", ja: "チケットは現在のステージに保たれます。" },
  "review.changesHint": { en: "Returns the ticket to In Progress. A note is required.", ja: "チケットを進行中に戻します。メモの記入が必要です。" },
  "review.noteRequiredToast": { en: "Please describe the required changes in the note field.", ja: "メモ欄に修正内容をご記入ください。" },
  "review.approvedToast": { en: "Approved - ticket moved to Done.", ja: "承認しました - チケットを完了へ移動しました。" },
  "review.changesToast": { en: "Changes requested - ticket returned to In Progress.", ja: "修正依頼を送信しました - チケットを進行中へ戻しました。" },
  "review.underReviewToast": { en: "Marked under review.", ja: "レビュー中にしました。" },
  "review.fail": { en: "Review failed.", ja: "レビューに失敗しました。" },
  "review.aClient": { en: "a client", ja: "クライアント" },
  "review.decisionLabel": { en: "Review decision", ja: "レビュー判断" },
  "review.noteRequiredPh": { en: "Explain what needs to change (required)…", ja: "修正が必要な点をご記入ください（必須）…" },
  "review.noteOptionalPh": { en: "Add an optional note…", ja: "メモを追加（任意）…" },
  "review.submitApprove": { en: "Approve ticket", ja: "チケットを承認" },
  "review.submitUnderReview": { en: "Mark under review", ja: "レビュー中にする" },
  "review.recordedNote": { en: "Review recorded above. Team members resolve feedback via normal ticket edits.", ja: "レビュー結果は上に記録されています。チームメンバーが通常のチケット編集で対応します。" },
  "review.awaitingNote": { en: "Awaiting stakeholder review. Clients see the decision controls here.", ja: "レビュー待ちです。クライアントにはここに判定操作が表示されます。" },


  /* questions panel */
  "q.title": { en: "Client questions", ja: "クライアントへの質問" },
  "q.question": { en: "question", ja: "質問" },
  "q.questions": { en: "questions", ja: "質問" },
  "q.draftHint": { en: "These attach to the ticket when you press", ja: "以下を押すとチケットに追加されます:" },
  "q.createTicketCta": { en: "Create ticket", ja: "チケットを作成" },
  "q.needsAnswer": { en: "Needs answer", ja: "回答が必要" },
  "q.required": { en: "Required", ja: "必須" },
  "q.answer": { en: "answer", ja: "回答" },
  "q.answers": { en: "answers", ja: "回答" },
  "q.newQuestion": { en: "New question", ja: "新しい質問" },
  "q.promptLabel": { en: "Question", ja: "質問" },
  "q.promptPh": { en: "e.g. Does this red tone work for the hero?", ja: "例: この赤いトーンはヒーローに合いますか?" },
  "q.answerType": { en: "Answer type", ja: "回答タイプ" },
  "q.typeChoice": { en: "Choice - client picks option(s)", ja: "選択式 - クライアントが選択" },
  "q.typeText": { en: "Text - client writes an answer", ja: "記述式 - クライアントが入力" },
  "q.options": { en: "Options", ja: "選択肢" },
  "q.optionPh": { en: 'Option N - e.g. "Softer red please"', ja: "選択肢 N - 例: もう少し柔らかい赤で" },
  "q.textFlag": { en: "Text", ja: "テキスト" },
  "q.addOption": { en: "Add option", ja: "選択肢を追加" },
  "q.clientCanPick": { en: "Client can pick", ja: "クライアントの選択方法" },
  "q.single": { en: "One option only", ja: "1つのみ選択" },
  "q.multi": { en: "Multiple options", ja: "複数選択" },
  "q.requiredFlag": { en: "Required - ticket can't be approved until answered", ja: "必須 - 回答があるまで承認できません" },
  "q.addQuestion": { en: "Add question", ja: "質問を追加" },
  "q.edit": { en: "Edit", ja: "編集" },
  "q.saveChanges": { en: "Save changes", ja: "変更を保存" },
  "q.cancel": { en: "Cancel", ja: "キャンセル" },
  "q.preview": { en: "Preview - the client can answer once the ticket is created.", ja: "プレビュー - チケット作成後にクライアントが回答できます。" },
  "q.needShortNote": { en: "needs a short note.", ja: "には簡単なメモが必要です。" },
  "q.textPh": { en: "Type your answer…", ja: "回答を入力…" },
  "q.pickOption": { en: "Pick an option", ja: "選択肢を選んでください" },
  "q.pickOptionText": { en: "Pick an option - some need details", ja: "選択肢を選んでください - 一部は詳細入力が必要です" },
  "q.writeAnswer": { en: "Write your answer", ja: "回答を入力してください" },
  "q.saveAnswer": { en: "Save answer", ja: "回答を保存" },
  "q.updateAnswer": { en: "Update answer", ja: "回答を更新" },
  "q.youAnswered": { en: "You answered", ja: "回答済み" },
  "q.answersHeading": { en: "Answers", ja: "回答一覧" },
  "q.detailsPh": { en: "Add details for", ja: "詳細を入力:" },
  "q.emptyClient": { en: "No verification questions yet - the team will add them here when they need your input.", ja: "質問はまだありません。チームが入力を求めるときにここに追加します。" },
  "q.textTypeNote": { en: "Text questions keep their type - adjust the wording or the “required” rule.", ja: "記述式の質問はタイプを変更できません。文章や「必須」設定のみ編集できます。" },
  "q.added": { en: "Question added.", ja: "質問を追加しました。" },
  "q.addedDraft": { en: "Question added to the new ticket.", ja: "質問を新しいチケットに追加しました。" },
  "q.updated": { en: "Question updated.", ja: "質問を更新しました。" },
  "q.deleted": { en: "Question deleted.", ja: "質問を削除しました。" },
  "q.deleteConfirm": { en: "Delete this question and its answers?", ja: "この質問とその回答を削除しますか？" },
  "q.answerSaved": { en: "Answer saved.", ja: "回答を保存しました。" },
  "q.minChars": { en: "The question must be at least 5 characters.", ja: "質問は5文字以上入力してください。" },
  "q.needTwoOptions": { en: "A choice question needs at least 2 options.", ja: "選択式の質問には選択肢が2つ以上必要です。" },
  "q.pickFirst": { en: "Select at least one option.", ja: "少なくとも1つの選択肢を選んでください。" },
  "q.sectionLabel": { en: "Client verification questions", ja: "クライアント確認質問" },
  "q.member": { en: "Member", ja: "メンバー" },
  "q.aMember": { en: "a member", ja: "メンバーの誰か" },
  "q.pickedBy": { en: "Picked by {name}", ja: "{name} が選択" },
  "q.optionNumPh": { en: 'Option {n} - e.g. "Softer red please"', ja: "選択肢 {n} - 例: もう少し柔らかい赤で" },
  "q.textOnTitle": { en: "Selecting this option reveals a text input", ja: "選択するとテキスト入力欄が表示されます" },
  "q.textOffTitle": { en: "Also ask for a text note when this option is picked", ja: "この選択肢を選んだときはテキスト入力も求めます" },
  "q.removeOption": { en: "Remove option {n}", ja: "選択肢 {n} を削除" },
  "q.textChip": { en: "text", ja: "テキスト" },
  "q.delete": { en: "Delete question", ja: "質問を削除" },
  "q.addFail": { en: "Could not add the question.", ja: "質問を追加できませんでした。" },
  "q.answerFail": { en: "Could not save the answer.", ja: "回答を保存できませんでした。" },
  "q.updateFail": { en: "Could not update the question.", ja: "質問を更新できませんでした。" },
  "q.deleteFail": { en: "Could not delete the question.", ja: "質問を削除できませんでした。" },
  "member.roleFail": { en: "Could not change the member's role.", ja: "メンバーの権限を変更できませんでした。" },
  "member.removeFail": { en: "Could not remove the member.", ja: "メンバーを削除できませんでした。" },


  /* attachments */
  "att.upload": { en: "Upload files", ja: "ファイルをアップロード" },
  "att.uploadHint": { en: "PNG, JPG, GIF or WebP images only, up to 10 MB", ja: "PNG・JPG・GIF・WebP の画像のみ、10MBまで" },
  "att.uploading": { en: "Uploading…", ja: "アップロード中…" },
  "att.remove": { en: "Remove attachment", ja: "添付ファイルを削除" },
  "att.button": { en: "Attach images (max 5, 10 MB each)", ja: "画像を添付（最大5枚、各10MB）" },
  "att.limitCount": { en: "Image limit reached - max {max} files.", ja: "上限に達しました - 最大 {max} 枚まで。" },
  "att.preview": { en: "preview", ja: "プレビュー" },
  "att.invalidType": { en: "{name}: only PNG, JPEG, GIF and WebP images are allowed.", ja: "{name}: アップロードできるのはPNG・JPEG・GIF・WebPの画像のみです。" },
  "att.tooLarge": { en: "{name}: files must be 10 MB or smaller.", ja: "{name}: ファイルは10MB以下にしてください。" },
  "att.fail": { en: "{name} failed to upload.", ja: "{name} をアップロードできませんでした。" },
  "att.removeNamed": { en: "Remove {name}", ja: "{name} を削除" },


  /* timeline */
  "act.empty": { en: "No activity yet.", ja: "アクティビティはまだありません。" },
  "act.someone": { en: "Someone", ja: "誰か" },
  "act.created": { en: "created this ticket", ja: "このチケットを作成しました" },
  "act.edited": { en: "edited the ticket", ja: "チケットを編集しました" },
  "act.updatedDetails": { en: "updated details", ja: "詳細を更新しました" },
  "act.movedFrom": { en: "moved this ticket from", ja: "チケットを移動:" },
  "act.movedTo": { en: "to", ja: "→" },
  "act.uploaded": { en: "uploaded", ja: "をアップロードしました" },
  "act.commented": { en: "commented", ja: "がコメントしました" },
  "act.approved": { en: "approved this ticket", ja: "このチケットを承認しました" },
  "act.underReview": { en: "marked this ticket under review", ja: "レビュー中にしました" },
  "act.changesRequested": { en: "requested changes", ja: "修正を依頼しました" },
  "act.submittedReview": { en: "submitted a review", ja: "レビューを送信しました" },
  "act.updatedTicket": { en: "updated the ticket", ja: "チケットを更新しました" },
  "act.movedTicket": { en: "moved this ticket", ja: "チケットを移動" },
  "act.movedTicketTo": { en: "moved this ticket to", ja: "チケットを移動:" },
  "act.uploadedFull": { en: "uploaded {name}", ja: "{name} をアップロードしました" },


  /* analytics */
  "an.title": { en: "Workspace analytics", ja: "ワークスペース分析" },
  "an.subtitle": { en: "Real numbers from your projects - delivery, client feedback and momentum over the last 14 days.", ja: "プロジェクトの実数値 - 直近14日間のデリバリー・クライアントフィードバック・活動量。" },
  "an.projects": { en: "Projects", ja: "プロジェクト" },
  "an.tickets": { en: "Tickets", ja: "チケット" },
  "an.overdue": { en: "Overdue", ja: "期限超過" },
  "an.awaiting": { en: "Awaiting clients", ja: "クライアント待ち" },
  "an.overdueSub": { en: "past due date, not done", ja: "期限切れ・未完了" },
  "an.requiredSub": { en: "required questions, unanswered", ja: "必須質問が未回答" },
  "an.open": { en: "open", ja: "オープン" },
  "an.byColumn": { en: "Tickets by column", ja: "カラム別チケット数" },
  "an.reviewOutcome": { en: "Review outcome", ja: "レビュー結果" },
  "an.reviewHint": { en: "What happened after clients reviewed tickets", ja: "クライアントレビュー後の結果" },
  "an.created": { en: "Tickets created", ja: "チケット作成数" },
  "an.createdHint": { en: "Last 14 days", ja: "直近14日間" },
  "an.activity": { en: "Activity", ja: "アクティビティ" },
  "an.activityHint": { en: "All tracked actions per day - comments, moves, answers…", ja: "1日ごとのすべての操作 - コメント・移動・回答など" },
  "an.workload": { en: "Workload by assignee", ja: "担当者別の負荷" },
  "an.workloadHint": { en: "Top 5 - total vs completed", ja: "上位5名 - 合計と完了数" },
  "an.priorityMix": { en: "Priority mix", ja: "優先度の分布" },
  "an.priorityHint": { en: "Where urgency sits right now", ja: "現在の緊急度の所在" },
  "an.clientResponse": { en: "Client response", ja: "クライアント回答率" },
  "an.answeredTotal": { en: "answers total", ja: "件の回答" },
  "an.answeredPct": { en: "answered", ja: "回答済み" },
  "an.deliverySpeed": { en: "Delivery speed", ja: "デリバリー速度" },
  "an.avgHours": { en: "avg hours to Done", ja: "完了までの平均時間" },
  "an.avgHoursSub": { en: "From creation to the move into the Done column.", ja: "作成からDoneカラムへの移動まで。" },
  "an.attention": { en: "Needs attention", ja: "要注意" },
  "an.nothingOverdue": { en: "Nothing overdue - nice.", ja: "期限超過はありません。" },
  "an.due": { en: "due", ja: "期限" },
  "an.perProject": { en: "Per project", ja: "プロジェクト別" },
  "an.done": { en: "done", ja: "完了" },
  "an.membersClients": { en: "{members} members · {clients} clients", ja: "メンバー{members}名・クライアント{clients}名" },
  "an.verificationAnswered": { en: "{answered}/{total} verification questions answered", ja: "確認質問 {answered}/{total} 件に回答済み" },
  "an.perProjectStat": { en: "{tickets} tickets · {done} done", ja: "チケット{tickets}件・完了{done}件" },


  /* knowledge */
  "kb.title": { en: "Knowledge brain", ja: "ナレッジブレイン" },
  "kb.subtitle": { en: "Your workspace as a living graph - projects, tickets, members and unanswered client questions. Hover to trace, click to inspect.", ja: "ワークスペースをグラフで可視化 - プロジェクト・チケット・メンバー・未回答の質問。ホバーで追跡、クリックで詳細。" },
  "kb.emptyTitle": { en: "Nothing mapped yet", ja: "まだ何もありません" },
  "kb.emptySub": { en: "Create a project with tickets and members - the brain grows as you work.", ja: "プロジェクトとチケットを作成すると、グラフが成長します。" },
  "kb.detailHint": { en: "Hover a node to light up its neighbourhood; click to pin details here.", ja: "ノードにホバーすると周辺が強調され、クリックで詳細が固定されます。" },
  "kb.project": { en: "Project", ja: "プロジェクト" },
  "kb.openBoard": { en: "Open on board →", ja: "ボードを開く →" },
  "kb.connections": { en: "direct connection", ja: "件の直接接続" },
  "kb.health": { en: "Project health", ja: "プロジェクト健全性" },
  "kb.formula": { en: "score = 40%·delivery + 20%·review + 25%·client feedback + 15%·momentum(14d)", ja: "スコア = 40%·完遂 + 20%·レビュー + 25%·顧客フィードバック + 15%·活動量(14日)" },
  "kb.fDelivery": { en: "Delivery", ja: "完遂" },
  "kb.fReview": { en: "Review health", ja: "レビュー健全性" },
  "kb.fFeedback": { en: "Client feedback", ja: "顧客フィードバック" },
  "kb.fMomentum": { en: "Momentum (14d)", ja: "活動量(14日)" },
  "kb.summaryProjects": { en: "Projects", ja: "プロジェクト" },
  "kb.summaryTickets": { en: "Tickets", ja: "チケット" },
  "kb.summaryMembers": { en: "Members", ja: "メンバー" },
  "kb.summaryQuestions": { en: "Questions", ja: "質問" },
  "kb.summaryAnswers": { en: "Answers", ja: "回答" },
  "kb.summaryComments": { en: "Comments", ja: "コメント" },
  "kb.legendTodo": { en: "To Do", ja: "ToDo" },
  "kb.legendInProgress": { en: "In Progress", ja: "進行中" },
  "kb.legendDone": { en: "Done", ja: "完了" },
  "kb.graphLabel": { en: "Workspace knowledge graph", ja: "ワークスペースのナレッジグラフ" },
  "kb.connectionsPlural": { en: "direct connections", ja: "件の直接接続" },


  /* ai review */
  "ai.title": { en: "AI content review", ja: "AIコンテンツレビュー" },
  "ai.hint": { en: "Gemini scores the ticket text and the client questions, then suggests improvements. Suggestions are read-only - you decide what (if anything) to change.", ja: "Geminiがチケット本文と質問を評価し改善案を提示します。提案は閲覧のみ - 適用するかどうかはあなたが決めます。" },
  "ai.analyze": { en: "Analyze content", ja: "内容を分析" },
  "ai.analyzing": { en: "Analyzing…", ja: "分析中…" },
  "ai.ready": { en: "AI review ready - apply only what you agree with.", ja: "AIレビューが完了 - 同意する提案のみ適用してください。" },
  "ai.maintenance": { en: "AI assistant is temporarily unavailable (maintenance).", ja: "AIアシスタントは一時的に利用できません（メンテナンス中）。" },
  "ai.score": { en: "Quality score", ja: "品質スコア" },
  "ai.suggestion": { en: "Suggestion:", ja: "提案:" },
  "ai.readonlyNote": { en: "Nothing is modified automatically - edit the fields yourself if you agree.", ja: "内容は自動的に変更されません - 同意する場合のみご自身で編集してください。" },
  "ai.dismiss": { en: "Dismiss AI review", ja: "AIレビューを閉じる" },

  /* members dialog */
  "member.dialogTitle": { en: "Project members", ja: "プロジェクトメンバー" },
  "member.descManage": { en: "Invite stakeholders and internal members by email.", ja: "メールでステークホルダーと社内メンバーを招待します。" },
  "member.descView": { en: "People collaborating on this project.", ja: "このプロジェクトに参加しているメンバーです。" },
  "member.owner": { en: "owner", ja: "オーナー" },
  "member.roleAdmin": { en: "Admin", ja: "管理者" },
  "member.roleTeam": { en: "Team", ja: "チーム" },
  "member.roleClient": { en: "Client", ja: "クライアント" },
  "member.removeAria": { en: "Remove {name}", ja: "{name} を削除" },
  "member.removeConfirm": { en: "Remove {name} from this project?", ja: "{name} をこのプロジェクトから削除しますか？" },
  "member.addTitle": { en: "Add member", ja: "メンバーを追加" },
  "member.add": { en: "Add", ja: "追加" },
  "member.clientNote": { en: "Added clients can review tickets once assigned.", ja: "追加されたクライアントは、割り当て後にチケットをレビューできます。" },
  "member.addFail": { en: "Could not add the member.", ja: "メンバーを追加できませんでした。" },
  "member.added": { en: "Member added.", ja: "メンバーを追加しました。" },
  "member.roleUpdated": { en: "Role updated.", ja: "ロールを更新しました。" },
  "member.removed": { en: "Member removed.", ja: "メンバーを削除しました。" },

  /* admin console */
  "admin.subtitle": { en: "Manage user accounts and global roles.", ja: "ユーザーアカウントと全体ロールを管理します。" },
  "admin.addUser": { en: "Add user", ja: "ユーザーを追加" },
  "admin.roleUpdated": { en: "Role updated.", ja: "ロールを更新しました。" },
  "admin.deleteConfirm": { en: "Delete account for {email}? This cannot be undone.", ja: "{email} のアカウントを削除しますか？この操作は取り消せません。" },
  "admin.deleted": { en: "User deleted.", ja: "ユーザーを削除しました。" },
  "admin.created": { en: "User created.", ja: "ユーザーを作成しました。" },
  "admin.createFail": { en: "Could not create the user.", ja: "ユーザーを作成できませんでした。" },
  "admin.roleFail": { en: "Could not update the user's role.", ja: "ユーザーの権限を更新できませんでした。" },
  "admin.deleteFail": { en: "Could not delete the user.", ja: "ユーザーを削除できませんでした。" },
  "admin.dialogDesc": { en: "Create a member or stakeholder account.", ja: "メンバーまたはステークホルダーのアカウントを作成します。" },
  "admin.tempPassword": { en: "Temporary password", ja: "仮パスワード" },
  "admin.globalRole": { en: "Global role", ja: "全体ロール" },
  "admin.createUser": { en: "Create user", ja: "ユーザーを作成" },
  "admin.you": { en: "you", ja: "あなた" },
  "admin.deleteAria": { en: "Delete {email}", ja: "{email} を削除" },
  "admin.roleAdminHint": { en: "Global control over users & projects", ja: "ユーザーとプロジェクト全体を管理" },
  "admin.roleTeamHint": { en: "Internal team member", ja: "社内チームメンバー" },
  "admin.roleClientHint": { en: "External stakeholder", ja: "社外ステークホルダー" },

  /* confirmations (branded delete/remove dialogs) */
  "confirm.delete": { en: "Delete", ja: "削除" },
  "confirm.remove": { en: "Remove", ja: "削除する" },

  /* unsaved-changes guard (round-33): ticket & project form dialogs */
  "unsaved.title": { en: "Save your changes?", ja: "変更を保存しますか？" },
  "unsaved.body": {
    en: "You have unsaved changes in this form. Saving keeps them; discarding closes the form and loses your edits.",
    ja: "未保存の変更があります。保存すると変更が保持され、破棄するとフォームを閉じて変更が失われます。",
  },
  "unsaved.save": { en: "Save", ja: "保存" },
  "unsaved.keepEditing": { en: "Keep editing", ja: "編集を続ける" },
  "unsaved.discard": { en: "Discard changes", ja: "変更を破棄" },

  /* round-34 notifications (bell + dropdown + @-mention autocomplete) */
  "notif.title": { en: "Notifications", ja: "通知" },
  "notif.unread": { en: "Unread", ja: "未読" },
  "notif.all": { en: "All", ja: "すべて" },
  "notif.markAll": { en: "Mark all as read", ja: "すべて既読にする" },
  "notif.markRead": { en: "Mark as read", ja: "既読にする" },
  "notif.markUnread": { en: "Mark as unread", ja: "未読にする" },
  "notif.empty": { en: "No notifications yet", ja: "通知はまだありません" },
  "notif.mention": {
    en: "{actor} mentioned you in ticket \"{ticket}\"",
    ja: "{actor} がチケット「{ticket}」であなたをメンションしました",
  },
  "notif.comment": {
    en: "{actor} commented on ticket \"{ticket}\"",
    ja: "{actor} がチケット「{ticket}」にコメントしました",
  },
  "notif.status_change": {
    en: "{actor} moved ticket \"{ticket}\" to \"{column}\"",
    ja: "{actor} がチケット「{ticket}」を「{column}」に移動しました",
  },
  "notif.assignment": {
    en: "{actor} assigned you a new ticket \"{ticket}\"",
    ja: "{actor} があなたに新しいチケット「{ticket}」を割り当てました",
  },
  "notif.feedback_requested": {
    en: "{actor} requested your feedback on ticket \"{ticket}\"",
    ja: "{actor} がチケット「{ticket}」のフィードバックを依頼しました",
  },
  "notif.feedback_approved": {
    en: "{actor} approved ticket \"{ticket}\"",
    ja: "{actor} がチケット「{ticket}」を承認しました",
  },
  "notif.feedback_changes": {
    en: "{actor} requested changes on ticket \"{ticket}\"",
    ja: "{actor} がチケット「{ticket}」に修正を依頼しました",
  },
  "notif.at": { en: "Mention a member", ja: "メンバーをメンション" },
  "notif.atHint": {
    en: "Type @ to tag a project member",
    ja: "@ と入力してプロジェクトのメンバーをタグできます",
  },
  "board.ticketGone": {
    en: "This ticket no longer exists (it may have been deleted).",
    ja: "このチケットは存在しないか、削除されました。",
  },

  /* board background picker (Trello-style, admin/team) */
  "bg.button": { en: "Background", ja: "背景" },
  "bg.title": { en: "Board background", ja: "ボードの背景" },
  "bg.desc": { en: "Pick an image from the curated gallery. Everyone on the project sees it; only admins and the team can change it.", ja: "ギャラリーから画像を選択します。プロジェクトの全メンバーに表示され、変更できるのは管理者とチームのみです。" },
  "bg.none": { en: "No background", ja: "背景なし" },
  "bg.saved": { en: "Background updated.", ja: "背景を更新しました。" },
  "bg.fail": { en: "Could not update the background.", ja: "背景を更新できませんでした。" },

  /* errors / misc */
  "att.unconfigured": { en: "File uploads are disabled - cloud storage is not configured on this deployment.", ja: "アップロードは無効です - このデプロイにはクラウドストレージが設定されていません。" },

  /* rich-text feedback editor (Tiptap) */
  "rt.image": { en: "Image", ja: "画像" },
  "rt.imageOnly": { en: "Only image files are supported here.", ja: "ここでは画像ファイルのみサポートしています。" },
  "rt.imageLimit": { en: "Image limit reached - max {max} images per message.", ja: "上限に達しました - 1メッセージ最大 {max} 枚まで。" },

  /* project progress strip (status-based completion) */
  "prog.title": { en: "Overview progress", ja: "全体の進捗" },
  "prog.donePct": { en: "{pct}% done", ja: "{pct}% 完了" },
  "prog.empty": { en: "No tickets in this project yet.", ja: "このプロジェクトにはまだチケットがありません。" },

  /* quick-add default question set (project-configurable, dynamic) */
  "quick.set": { en: "Default set", ja: "デフォルトセット" },
  "quick.setHint": { en: "Add every configured default question in one tap.", ja: "設定済みのデフォルト質問をワンタップで追加します。" },
  "quick.setCount": { en: "{n} ready", ja: "{n} 件準備完了" },
  "quick.added": { en: "{n} default questions added.", ja: "デフォルト質問を {n} 件追加しました。" },
  "quick.addedDraft": { en: "{n} default questions added to the draft.", ja: "ドラフトにデフォルト質問を {n} 件追加しました。" },
  "quick.fail": { en: "Could not add the default set. Try again.", ja: "デフォルトセットを追加できませんでした。もう一度お試しください。" },

  /* project edit dialog: default question set editor */
  "dq.title": { en: "Quick-add default questions", ja: "クイック追加のデフォルト質問" },
  "dq.typeChoice": { en: "Choice", ja: "選択式" },
  "dq.typeText": { en: "Text", ja: "記述式" },
  "dq.desc": { en: "Build the one-tap \"Default set\" used in the ticket's questions panel. Order is kept at insert. Every ticket receives its own independent copy - later edits here never change questions already created.", ja: "チケットの質問パネルにある「デフォルトセット」ボタンの内容を設定します。追加時はこの順序が保たれ、各チケットは独立したコピーを受け取るため、後からここを編集しても既存の質問は変わりません。" },
  "dq.clearAll": { en: "Clear set", ja: "セットを空にする" },
  "dq.addRow": { en: "Add question to set", ja: "質問をセットに追加" },
  "dq.removeRow": { en: "Remove question {n} from the set", ja: "質問 {n} をセットから削除" },

  /* board filters (search + assignee + priority) */
  "filt.search": { en: "Search tickets...", ja: "チケットを検索..." },
  "filt.assigneeAll": { en: "All assignees", ja: "すべての担当者" },
  "filt.unassigned": { en: "Unassigned only", ja: "未割り当てのみ" },
  "filt.priorityAll": { en: "All priorities", ja: "すべての優先度" },
  "filt.reset": { en: "Reset filters", ja: "フィルターをリセット" },
  "filt.showing": { en: "{shown} of {total} tickets match", ja: "{total} 件中 {shown} 件が一致" },

  /* project header gradient picker */
  "grad.pick": { en: "Card header color", ja: "カードヘッダーの色" },
  "grad.indigo": { en: "Classic indigo", ja: "クラシック・インディゴ" },
  "grad.ocean": { en: "Deep ocean", ja: "ディープ・オーシャン" },
  "grad.steel": { en: "Steel navy", ja: "スチール・ネイビー" },
  "grad.sky": { en: "Sky line", ja: "スカイ・ライン" },
  "grad.teal": { en: "Teal wave", ja: "ティール・ウェーブ" },
  "grad.amber": { en: "Amber dusk", ja: "アンバー・ダスク" },
  "grad.rose": { en: "Soft rose", ja: "ソフト・ローズ" },
  "grad.emerald": { en: "Emerald deep", ja: "エメラルド・ディープ" },
  "grad.lagoon": { en: "Lagoon cyan", ja: "ラグーン・シアン" },
  "grad.mist": { en: "Morning mist", ja: "モーニング・ミスト" },
  "grad.midnight": { en: "Midnight", ja: "ミッドナイト" },
  "grad.usesPreset": { en: "Using a custom gradient:", ja: "カスタムグラデーション使用中:" },
  "grad.usesAuto": { en: "Automatic cover (name-based). Click a swatch to choose a custom one.", ja: "自動カバー（名前ベース）。スウォッチをクリックすると変更できます。" },

  /* home search */
  "home.searchPh": { en: "Search projects...", ja: "プロジェクトを検索..." },
  "home.searchClear": { en: "Clear search", ja: "検索をクリア" },
  "home.searchNoMatch": { en: "No projects match your search.", ja: "検索に一致するプロジェクトがありません。" },

  /* project meta edit (admin/team) */
  "prj.edit": { en: "Edit project", ja: "プロジェクトを編集" },
  "prj.editDesc": { en: "Update the project name and description visible to every member.", ja: "全メンバーに表示されるプロジェクト名と説明を更新します。" },
  "prj.save": { en: "Save changes", ja: "変更を保存" },
  "prj.saved": { en: "Project updated.", ja: "プロジェクトを更新しました。" },
  "prj.saveFail": { en: "Could not save the project. Try again.", ja: "プロジェクトを保存できませんでした。もう一度お試しください。" },
  "att.uploadFail": { en: "Upload failed. Try again.", ja: "アップロードに失敗しました。もう一度お試しください。" },
  "rt.uploadFail": { en: "Image upload failed. Try again.", ja: "画像のアップロードに失敗しました。もう一度お試しください。" },
  "err.notFoundTitle": { en: "This page doesn't exist", ja: "このページは存在しません" },
  "err.notFoundSub": { en: "The page you are looking for was moved, removed, or you don't have access to it.", ja: "お探しのページは移動・削除されたか、アクセス権がありません。" },
  "err.backToProjects": { en: "Back to projects", ja: "プロジェクトへ戻る" },
  "err.somethingWrong": { en: "Something went wrong", ja: "問題が発生しました" },
  "err.retry": { en: "Try again", ja: "再試行" },
  "err.unexpected": { en: "An unexpected error occurred while loading this page.", ja: "ページの読み込み中に予期しないエラーが発生しました。" },

  /* API error messages surfaced in toasts - localized by the stable code the
     API attaches to every error response (server message stays the EN detail) */
  "api.authRequired": { en: "Please sign in first.", ja: "先にサインインしてください。" },
  "api.forbidden": { en: "You don't have permission for this action.", ja: "この操作の権限がありません。" },
  "api.notFound": { en: "That item no longer exists.", ja: "対象が見つかりませんでした。" },
  "api.validation": { en: "Your input needs a small fix.", ja: "入力内容をご確認ください。" },
  "api.conflict": { en: "That value is already in use.", ja: "その値は既に使用されています。" },
  "api.rateLimited": { en: "Too many requests - please wait a moment and try again.", ja: "リクエストが集中しています。少し待ってからもう一度お試しください。" },
  "api.serviceUnavailable": { en: "This service is briefly unavailable. Try again shortly.", ja: "このサービスは現在一時的に利用できません。しばらくしてからお試しください。" },
  "api.aiMaintenance": { en: "AI review is temporarily unavailable.", ja: "AIレビューは現在一時的に利用できません。" },
  "api.projectNameTaken": { en: "That project name is already used by another project.", ja: "そのプロジェクト名は他のプロジェクトで既に使用されています。" },
  "api.ticketNameTaken": { en: "That ticket title already exists in this project.", ja: "このプロジェクトに同じタイトルのチケットが既に存在します。" },
  "api.memberAlready": { en: "That member is already in this project.", ja: "そのメンバーは既にこのプロジェクトに参加しています。" },
  "api.userNotFound": { en: "No account with that email exists - ask them to register first.", ja: "そのメールアドレスのアカウントはまだありません。先に登録してもらいましょう。" },
  "api.internal": { en: "Something went wrong on our side. Try again.", ja: "内部エラーが発生しました。もう一度お試しください。" },
} as const;

export type DictKey = keyof typeof DICT;

/** Stable API error codes -> dict keys. Missing codes fall back to the server message. */
const API_CODE_KEY: Record<string, string> = {
  AUTH_REQUIRED: "api.authRequired",
  FORBIDDEN: "api.forbidden",
  NOT_FOUND: "api.notFound",
  VALIDATION: "api.validation",
  CONFLICT: "api.conflict",
  RATE_LIMITED: "api.rateLimited",
  SERVICE_UNAVAILABLE: "api.serviceUnavailable",
  AI_MAINTENANCE: "api.aiMaintenance",
  PROJECT_NAME_TAKEN: "api.projectNameTaken",
  TICKET_NAME_TAKEN: "api.ticketNameTaken",
  MEMBER_ALREADY: "api.memberAlready",
  USER_NOT_FOUND: "api.userNotFound",
  INTERNAL: "api.internal",
};

/**
 * Localize an error for the toast layer: when the thrown/fetched error carries
 * a known `code`, the message is rendered in the ACTIVE language; otherwise
 * the caller's own localized fallback key (or the raw server detail if any)
 * is used. Works for ApiClientError (API routes) and ActionResult errors
 * ({ error, code } from server actions) alike.
 */
export function explainApi(
  err: unknown,
  t: (key: DictKey, vars?: Record<string, string | number>) => string,
  fallbackKey: DictKey,
  vars?: Record<string, string | number>,
): string {
  const code = (err as { code?: unknown } | null)?.code;
  const key = typeof code === "string" ? API_CODE_KEY[code] : undefined;
  if (key && (DICT as Record<string, Entry | undefined>)[key]) {
    return t(key as DictKey, vars);
  }
  const detail = (err as { message?: unknown; error?: unknown } | null);
  const message =
    typeof detail?.message === "string"
      ? detail.message
      : typeof detail?.error === "string"
        ? detail.error
        : "";
  return message || t(fallbackKey, vars);
}

export function tFor(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  const entry = DICT[key] as Entry | undefined;
  let text: string = entry ? entry[lang] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}
