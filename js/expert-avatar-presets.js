(function () {
  function portrait(spec) {
    var female = spec.gender === 'female';
    var backHair = female
      ? '<path d="M17 27c-1-12 5-18 15-18s16 7 15 18l1 24c-6 4-13 3-16-1-4 4-11 5-16 1Z" fill="' + spec.hair + '"/>'
      : '';
    var maleHair = [
      'M19 26c-1-10 4-16 13-16 9 0 14 6 13 16-4-1-7-5-8-8-4 5-10 7-18 8Z',
      'M19 25c0-10 5-15 13-15 9 0 14 6 13 15-4-4-8-5-13-5-4 0-9 2-13 5Z',
      'M18 26c-1-11 6-17 14-17 10 0 16 8 13 18-2-5-6-8-10-8-7 0-10 5-17 7Z'
    ];
    var femaleHair = [
      'M18 28c-2-11 3-17 14-17 10 0 16 6 14 17-3-4-6-8-8-11-5 6-12 9-20 11Z',
      'M18 27c-1-11 5-16 14-16 9 0 15 6 14 16-5-2-9-5-12-9-3 5-9 8-16 9Z',
      'M18 28c-2-11 4-17 14-17 10 0 16 7 14 17-3-4-7-6-11-9-4 6-10 8-17 9Z'
    ];
    var hair = '<path d="' + (female ? femaleHair[spec.style % 3] : maleHair[spec.style % 3])
      + '" fill="' + spec.hair + '"/>';
    var glasses = spec.glasses
      ? '<g fill="none" stroke="#596575" stroke-width="1.5"><rect x="21" y="29" width="10" height="7" rx="2.5"/><rect x="33" y="29" width="10" height="7" rx="2.5"/><path d="M31 32h2"/></g>'
      : '';
    var helmet = spec.helmet
      ? '<path d="M20 23c1-7 5-11 12-11s11 4 12 11Z" fill="' + spec.helmet + '"/><path d="M17 23h30v4H17z" fill="' + spec.helmet + '"/>'
      : '';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
      + '<rect width="64" height="64" rx="12" fill="' + spec.bg + '"/>'
      + backHair
      + '<path d="M10 64c1-10 8-16 18-17l4 5 4-5c10 1 17 7 18 17Z" fill="' + spec.coat + '"/>'
      + '<path d="m25 48 7 8 7-8-3-2h-8Z" fill="#F7F9FC"/>'
      + '<path d="M29 42h6v8h-6z" fill="' + spec.skin + '"/>'
      + '<ellipse cx="18.5" cy="31" rx="2.5" ry="3" fill="' + spec.skin + '"/>'
      + '<ellipse cx="45.5" cy="31" rx="2.5" ry="3" fill="' + spec.skin + '"/>'
      + '<path d="M19 25c0-10 5-15 13-15s13 5 13 15v10c0 9-5 15-13 15s-13-6-13-15Z" fill="' + spec.skin + '"/>'
      + hair + helmet
      + '<path d="M24 28h6m4 0h6" fill="none" stroke="' + spec.hair + '" stroke-width="1.4" stroke-linecap="round"/>'
      + '<circle cx="27" cy="32" r="1.1" fill="#303744"/><circle cx="37" cy="32" r="1.1" fill="#303744"/>'
      + glasses
      + '<path d="M31 35.5h2" fill="none" stroke="#B4795B" stroke-width="1.2" stroke-linecap="round"/>'
      + '<path d="M29 41.5q3 1.2 6 0" fill="none" stroke="#965C56" stroke-width="1.4" stroke-linecap="round"/>'
      + '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  var specs = [
    { id: 'general-man', label: '通用专家 · 男', gender: 'male', style: 0, bg: '#EAF2FC', skin: '#D99A70', hair: '#334155', coat: '#4C79A8' },
    { id: 'general-woman', label: '通用专家 · 女', gender: 'female', style: 0, bg: '#F6EEF5', skin: '#E9B48D', hair: '#453642', coat: '#876C97' },
    { id: 'process-man', label: '工艺专家 · 男', gender: 'male', style: 1, bg: '#EEF4F5', skin: '#D3976E', hair: '#3E3A37', coat: '#53777B', helmet: '#E7B459' },
    { id: 'process-woman', label: '工艺专家 · 女', gender: 'female', style: 1, bg: '#FFF3EA', skin: '#C9845D', hair: '#352D31', coat: '#A76454', helmet: '#E9B95D' },
    { id: 'algorithm-man', label: '算法专家 · 男', gender: 'male', style: 2, bg: '#EDF0FB', skin: '#EDBD97', hair: '#2F3548', coat: '#586C9D', glasses: true },
    { id: 'algorithm-woman', label: '算法专家 · 女', gender: 'female', style: 2, bg: '#F1EDFA', skin: '#D89470', hair: '#433850', coat: '#75639A', glasses: true },
    { id: 'operations-man', label: '运维专家 · 男', gender: 'male', style: 0, bg: '#E8F4F3', skin: '#B97653', hair: '#343A3B', coat: '#3D8580' },
    { id: 'operations-woman', label: '运维专家 · 女', gender: 'female', style: 0, bg: '#EDF8F6', skin: '#F0C39F', hair: '#604538', coat: '#4C9B8D' },
    { id: 'quality-man', label: '质量专家 · 男', gender: 'male', style: 1, bg: '#F2F2FA', skin: '#E7AE85', hair: '#51413D', coat: '#65748E', glasses: true },
    { id: 'quality-woman', label: '质量专家 · 女', gender: 'female', style: 1, bg: '#F8F0F3', skin: '#C98664', hair: '#332F36', coat: '#8F6680' },
    { id: 'supply-woman', label: '供应链专家 · 女', gender: 'female', style: 2, bg: '#F6F3EA', skin: '#E5B38F', hair: '#574034', coat: '#95805D' },
    { id: 'safety-man', label: '安全专家 · 男', gender: 'male', style: 0, bg: '#EDF5EE', skin: '#A96F51', hair: '#2C3330', coat: '#558766', helmet: '#D6AD56' },
    { id: 'safety-woman', label: '安全专家 · 女', gender: 'female', style: 0, bg: '#EAF7EF', skin: '#D49973', hair: '#493C35', coat: '#5C9475', helmet: '#E3BD69' },
    { id: 'energy-man', label: '能源专家 · 男', gender: 'male', style: 1, bg: '#EDF5FA', skin: '#EAB991', hair: '#3F4650', coat: '#4E8297' },
    { id: 'digital-woman', label: '数字化顾问 · 女', gender: 'female', style: 2, bg: '#F3EFFA', skin: '#EDBD99', hair: '#594354', coat: '#806C9C', glasses: true }
  ];
  var presets = specs.map(function (spec) {
    return { id: spec.id, label: spec.label, src: portrait(spec) };
  });
  window.ExpertAvatarPresets = { DEFAULT: presets[0].src, list: presets };
})();
