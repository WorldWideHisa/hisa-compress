// DOM要素の取得
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const fileDimensions = document.getElementById('file-dimensions');
const removeFileButton = document.getElementById('remove-file');
const processingSection = document.getElementById('processing-section');
const progressBar = document.getElementById('progress-bar');
const resultSection = document.getElementById('result-section');
const originalImage = document.getElementById('original-image');
const processedImage = document.getElementById('processed-image');
const originalSize = document.getElementById('original-size');
const processedSize = document.getElementById('processed-size');
const compressionRatio = document.getElementById('compression-ratio');
const downloadButton = document.getElementById('download-button');
const createThumbnailButton = document.getElementById('create-thumbnail-button');
const thumbnailSection = document.getElementById('thumbnail-section');
const thumbnailImage = document.getElementById('thumbnail-image');
const thumbnailSize = document.getElementById('thumbnail-size');
const downloadThumbnailButton = document.getElementById('download-thumbnail-button');
const startOverButton = document.getElementById('start-over');

// 状態管理
let currentFile = null;
let uploadedFilename = null;

// ドラッグ＆ドロップイベントのハンドラー
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
  dropArea.classList.add('active');
}

function unhighlight() {
  dropArea.classList.remove('active');
}

// ファイルドロップ処理
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length > 0) {
    handleFiles(files[0]);
  }
}

// ファイル選択処理
fileInput.addEventListener('change', function() {
  if (this.files.length > 0) {
    handleFiles(this.files[0]);
  }
});

// ファイル処理
function handleFiles(file) {
  console.log("ファイルタイプ:", file.type);
  console.log("ファイル名:", file.name);

  // ファイル拡張子を取得
  const fileExt = '.' + file.name.split('.').pop().toLowerCase();
  console.log("ファイル拡張子:", fileExt);

  // サポートされている拡張子
  const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif'];

  // サポートされているMIMEタイプ
  const validTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif',
    // 一部のブラウザでは汎用的なMIMEタイプとして認識される可能性がある
    'application/octet-stream'
  ];

  // HEICファイルの場合、拡張子でチェック
  const isHeicFile = fileExt === '.heic' || fileExt === '.heif';

  // 拡張子が有効、またはMIMEタイプが有効であればOK
  const isValidFile = validExts.includes(fileExt) || validTypes.includes(file.type);

  if (!isValidFile) {
    alert(`サポートされていないファイル形式です。PNG、JPEG、WebP、またはHEIC画像をアップロードしてください。\nファイルタイプ: ${file.type}\n拡張子: ${fileExt}`);
    return;
  }

  // HEICファイルの場合、プレビューが表示できない可能性があることを警告
  if (isHeicFile) {
    console.log("HEICファイルが検出されました。プレビューが表示されない場合がありますが、処理は可能です。");
    alert("HEICファイルが検出されました。プレビューが表示されない場合がありますが、処理は可能です。");
  }

  currentFile = file;
  displayFilePreview(file);
  uploadButton.disabled = false;
}

// ファイルプレビュー表示
function displayFilePreview(file) {
  const reader = new FileReader();

  reader.onload = function(e) {
    // プレビュー画像を表示
    imagePreview.src = e.target.result;

    // 画像の寸法を取得
    const img = new Image();
    img.onload = function() {
      fileDimensions.textContent = `${this.width} × ${this.height} px`;
    };
    img.src = e.target.result;

    // ファイル情報を表示
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    // プレビューコンテナを表示
    document.querySelector('.drop-message').classList.add('hidden');
    previewContainer.classList.remove('hidden');
  };

  reader.readAsDataURL(file);
}

// ファイルサイズのフォーマット
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

// ファイル削除
removeFileButton.addEventListener('click', function() {
  resetUploadArea();
});

function resetUploadArea() {
  currentFile = null;
  uploadButton.disabled = true;
  document.querySelector('.drop-message').classList.remove('hidden');
  previewContainer.classList.add('hidden');
  fileInput.value = '';
}

// ファイルアップロード
uploadButton.addEventListener('click', uploadFile);

async function uploadFile() {
  if (!currentFile) return;

  try {
    // アップロードセクションを非表示
    document.querySelector('.upload-section').classList.add('hidden');

    // 処理セクションを表示
    processingSection.classList.remove('hidden');

    // プログレスバーのアニメーション
    progressBar.style.width = '0%';
    setTimeout(() => {
      progressBar.style.width = '30%';
    }, 300);

    // ファイル拡張子を取得
    const fileExt = '.' + currentFile.name.split('.').pop().toLowerCase();
    const isHeicFile = fileExt === '.heic' || fileExt === '.heif';

    // HEICファイルの場合、特別な処理を行う
    if (isHeicFile) {
      console.log("HEICファイルをアップロードします。特別な処理を適用します。");
      // MIMEタイプを強制的に設定（Chromeでの問題対応）
      const mimeType = 'application/octet-stream';
      console.log(`MIMEタイプを ${mimeType} に設定します`);
    }

    // FormDataの作成
    const formData = new FormData();

    // ファイル名を明示的に設定（HEICファイルの場合に特に重要）
    let fileType = currentFile.type;

    // HEICファイルの場合、MIMEタイプを強制的に設定
    if (isHeicFile) {
      fileType = 'application/octet-stream';
    }

    const blob = currentFile.slice(0, currentFile.size, fileType);
    const newFile = new File([blob], currentFile.name, { type: fileType });
    formData.append('image', newFile);

    // ファイルのアップロード
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error('ファイルのアップロードに失敗しました');
    }

    const uploadResult = await uploadResponse.json();
    uploadedFilename = uploadResult.filename;

    // プログレスバーを更新
    progressBar.style.width = '60%';

    // 画像処理リクエスト
    const processResponse = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename: uploadedFilename })
    });

    if (!processResponse.ok) {
      throw new Error('画像の処理に失敗しました');
    }

    const processResult = await processResponse.json();

    // プログレスバーを完了
    progressBar.style.width = '100%';

    // 処理結果を表示
    setTimeout(() => {
      displayResults(processResult);
    }, 500);

  } catch (error) {
    console.error('Error:', error);
    alert(`エラーが発生しました: ${error.message}`);

    // エラー時は初期状態に戻す
    processingSection.classList.add('hidden');
    document.querySelector('.upload-section').classList.remove('hidden');
  }
}

// 処理結果の表示
function displayResults(result) {
  // 処理セクションを非表示
  processingSection.classList.add('hidden');

  // 結果セクションを表示
  resultSection.classList.remove('hidden');

  // 元の画像を表示
  originalImage.src = result.original.path;

  // 処理済み画像を表示
  processedImage.src = result.processed.path;

  // 圧縮率を表示
  compressionRatio.textContent = result.compressionRatio;

  // 元のファイルサイズを取得して表示（非同期）
  fetch(result.original.path)
    .then(response => {
      const originalSizeBytes = response.headers.get('content-length');
      originalSize.textContent = formatFileSize(originalSizeBytes);
    })
    .catch(error => {
      console.error('Error fetching original file size:', error);
    });

  // 処理済みファイルサイズを取得して表示（非同期）
  fetch(result.processed.path)
    .then(response => {
      const processedSizeBytes = response.headers.get('content-length');
      processedSize.textContent = formatFileSize(processedSizeBytes);
    })
    .catch(error => {
      console.error('Error fetching processed file size:', error);
    });

  // ダウンロードボタンの設定
  downloadButton.onclick = () => {
    window.location.href = result.processed.path;
  };
}

// サムネイル作成
createThumbnailButton.addEventListener('click', createThumbnail);

async function createThumbnail() {
  if (!uploadedFilename) return;

  try {
    // ボタンを無効化
    createThumbnailButton.disabled = true;
    createThumbnailButton.textContent = '処理中...';

    // サムネイル作成リクエスト
    const response = await fetch('/api/thumbnail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename: uploadedFilename })
    });

    if (!response.ok) {
      throw new Error('サムネイルの作成に失敗しました');
    }

    const result = await response.json();

    // サムネイルを表示
    thumbnailImage.src = result.thumbnail.path;

    // サムネイルのファイルサイズを取得して表示（非同期）
    fetch(result.thumbnail.path)
      .then(response => {
        const thumbnailSizeBytes = response.headers.get('content-length');
        thumbnailSize.textContent = formatFileSize(thumbnailSizeBytes);
      })
      .catch(error => {
        console.error('Error fetching thumbnail file size:', error);
      });

    // サムネイルセクションを表示
    thumbnailSection.classList.remove('hidden');

    // サムネイルダウンロードボタンの設定
    downloadThumbnailButton.onclick = () => {
      window.location.href = result.thumbnail.path;
    };

    // ボタンを元に戻す
    createThumbnailButton.disabled = false;
    createThumbnailButton.textContent = 'サムネイル作成';

  } catch (error) {
    console.error('Error:', error);
    alert(`エラーが発生しました: ${error.message}`);

    // ボタンを元に戻す
    createThumbnailButton.disabled = false;
    createThumbnailButton.textContent = 'サムネイル作成';
  }
}

// 最初からやり直す
startOverButton.addEventListener('click', function() {
  // 結果セクションを非表示
  resultSection.classList.add('hidden');

  // サムネイルセクションを非表示
  thumbnailSection.classList.add('hidden');

  // アップロードセクションをリセットして表示
  resetUploadArea();
  document.querySelector('.upload-section').classList.remove('hidden');
});
