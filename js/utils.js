/**
 * 通用工具函数
 */
(function () {
  window.readImageFile = function (file, onSuccess) {
    if (!file) return false;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      ElementPlus.ElMessage.warning('请选择图片文件');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      ElementPlus.ElMessage.warning('图片大小不能超过 2MB');
      return false;
    }
    var reader = new FileReader();
    reader.onload = function (ev) { onSuccess(ev.target.result); };
    reader.readAsDataURL(file);
    return true;
  };
})();
