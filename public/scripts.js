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
  // サポートされているファイル形式をチェック
  const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    alert('サポートされていないファイル形式です。PNG、JPEG、またはWebP画像をアップロードしてください。');
    return;
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
    
    // FormDataの作成
    const formData = new FormData();
    formData.append('image', currentFile);
    
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

// 最初からやり直す
startOverButton.addEventListener('click', function() {
  // 結果セクションを非表示
  resultSection.classList.add('hidden');
  
  // アップロードセクションをリセットして表示
  resetUploadArea();
  document.querySelector('.upload-section').classList.remove('hidden');
});
