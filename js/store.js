/**
 * localStorage 数据层 — 专家 & 项目原型
 */
(function () {
  const STORAGE_KEY = 'expert_platform_v1';
  const DEFAULT_EXPERT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#e8eef8"/><circle cx="40" cy="29" r="13" fill="#b8c5dc"/><ellipse cx="40" cy="63" rx="21" ry="15" fill="#b8c5dc"/></svg>'
  );

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function nowIso() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  function daysAgoIso(days, hour, minute) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour == null ? 10 : hour, minute == null ? 0 : minute, 0, 0);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  function minutesAgoIso(minutes) {
    var d = new Date();
    d.setMinutes(d.getMinutes() - (minutes || 0));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  function resolveDemoTaskCreatedAt(def) {
    if (def.minutesAgo != null) return minutesAgoIso(def.minutesAgo);
    return daysAgoIso(def.daysAgo, def.hour, def.minute);
  }

  function addMinutesIso(baseIso, minutes) {
    var d = new Date(String(baseIso).replace(' ', 'T'));
    if (isNaN(d.getTime())) return baseIso;
    d.setMinutes(d.getMinutes() + (minutes || 0));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  function getExpertDemoCapabilities(expertId) {
    var skillIds = state.skillBindings[expertId] || [];
    var toolIds = state.toolBindings[expertId] || [];
    var skill = (window.SKILLS_CATALOG || []).find(function (s) { return s.id === skillIds[0]; });
    var tool = (window.TOOLS_CATALOG || []).find(function (t) { return t.id === toolIds[0]; });
    return {
      skill: skill ? skill.name : '专业分析',
      tool: tool ? tool.name : '数据查询'
    };
  }

  function enrichMessagesWithExpertFlow(messages, expertId) {
    var cap = getExpertDemoCapabilities(expertId);
    var out = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.type && m.type !== 'chat') {
        out.push(m);
        continue;
      }
      out.push(Object.assign({ type: 'chat' }, m));
      if (m.role !== 'user') continue;
      var inject = false;
      for (var j = i + 1; j < messages.length; j++) {
        if (messages[j].role === 'user') break;
        if (messages[j].role === 'expert' && (!messages[j].type || messages[j].type === 'chat')) {
          inject = true;
          break;
        }
        if (messages[j].type && messages[j].type !== 'chat') break;
      }
      if (inject) {
        out.push(
          { role: 'expert', type: 'thought', content: 'Thought: 明确问题边界，梳理所需数据来源与分析路径。' },
          { role: 'expert', type: 'skill', skillName: cap.skill, content: '正在运用 [' + cap.skill + '] 技能处理该请求…' },
          { role: 'expert', type: 'action', toolName: cap.tool, content: '正在调用 [' + cap.tool + '] 获取相关数据…' }
        );
      }
    }
    return out;
  }

  function taskMessagesHaveRichTypes(msgs) {
    return (msgs || []).some(function (m) {
      return m.type === 'thought' || m.type === 'skill' || m.type === 'action';
    });
  }

  function buildDemoMessages(def, baseIso, expertId) {
    var raw = def.messages || [];
    var processed = enrichMessagesWithExpertFlow(raw, expertId);
    return processed.map(function (m, i) {
      var offset = m.offsetMin != null ? m.offsetMin : i * 2;
      return {
        id: uid(),
        role: m.role,
        type: m.type || 'chat',
        content: m.content,
        toolName: m.toolName || null,
        skillName: m.skillName || null,
        expertId: m.role === 'expert' ? String(expertId) : null,
        attachments: m.attachments || null,
        createdAt: addMinutesIso(baseIso, offset)
      };
    });
  }

  function getDemoDialogueTaskBundle(expertId) {
    var bundles = {
      '1': [
      {
        title: '电镀工艺 DOE 实验设计',
        status: 'running',
        minutesAgo: 12,
        messages: [
          { role: 'user', content: '新电镀液配方的膜厚均匀性不稳定，请帮忙设计一组 DOE 实验。', offsetMin: 0 },
          { role: 'expert', content: '收到。请确认当前因子范围：电流密度、温度、搅拌速率是否可调？我将据此设计 3 因子 2 水平正交表。', offsetMin: 2 },
          { role: 'user', content: '电流密度 2~5 A/dm²、温度 25~35℃、搅拌 200~400 rpm，均可调。', offsetMin: 5 },
          { role: 'expert', content: '正在生成 DOE 实验矩阵并估算样本量，同时调用 MES 查询近 3 批膜厚分布作为基线…', offsetMin: 8 }
        ],
        artifacts: []
      },
      {
        title: '分析上周良率下降原因',
        status: 'pending',
        daysAgo: 1, hour: 14, minute: 20,
        messages: [
          { role: 'user', content: '请帮我分析上周产线良率下降 2% 的可能原因。', offsetMin: 0 },
          { role: 'expert', content: '好的。我需要以下数据：1) 各站点良率趋势 2) 缺陷 pareto 3) 关键设备 PM 记录。您可先上传或授权 MES 查询。', offsetMin: 2 },
          { role: 'user', content: '已授权 MES 查询，同时附上近 4 周各站点良率趋势。', offsetMin: 15 },
          { role: 'expert', content: '收到数据。etch-3 站点良率从 94.2% 降至 91.8%，下降最为明显；CVD 段相对稳定。结合 PM 记录，etch-3 上次 chamber 清洁已超期 3 天，疑似颗粒污染导致。', offsetMin: 22 },
          { role: 'user', content: '那下一步建议怎么处理？', offsetMin: 38 },
          { role: 'expert', content: '建议：① 立即执行 etch-3 chamber 深度清洁 ② 冻结该 chamber 产品流并复测近 2 批 ③ 清洁后加严 SPC 监控 24h。我已整理数据需求清单供参考。', offsetMin: 45 }
        ],
        artifacts: [
          { title: '良率数据需求清单', content: '请提供：① 各站点良率趋势（近 4 周）② 缺陷 pareto ③ 关键设备 PM 记录', type: 'document' }
        ]
      },
      {
        title: 'etch 区 chamber 参数回标建议',
        status: 'pending',
        daysAgo: 2, hour: 9, minute: 45,
        messages: [
          { role: 'user', content: '根据根因分析，请输出 etch 区 3 号 chamber 压力参数的回标建议。', offsetMin: 0 },
          { role: 'expert', content: '建议将 chamber 压力从当前 125 mTorr 回标至标准值 113 mTorr（±2 mTorr），并同步检查 throttle valve 响应曲线。', offsetMin: 4 },
          { role: 'user', content: '回标后需要跑多少片验证？有没有风险点需要注意？', offsetMin: 20 },
          { role: 'expert', content: '建议首件验证 25 片，确认良率恢复后再扩至 50 片量产验证。风险点：throttle valve 老化可能导致压力波动，回标后前 2 小时需人工巡检。', offsetMin: 28 },
          { role: 'user', content: '好的，请输出一份操作指引方便产线执行。', offsetMin: 45 },
          { role: 'expert', content: '已整理《参数回标操作指引》，包含停机确认、参数修改、首件验证、SPC 加严监控四步流程，请查收任务产物。', offsetMin: 52 }
        ],
        artifacts: [
          { title: '参数回标操作指引', content: '回标步骤：① 停机确认 ② 参数修改 ③ 首件验证 ④ SPC 加严监控 24h', type: 'report' }
        ]
      },
      {
        title: '缺陷 pareto 数据解读',
        status: 'pending',
        daysAgo: 3, hour: 16, minute: 10,
        messages: [
          { role: 'user', content: '已上传近两周缺陷 pareto 数据，请解读 Top3 缺陷类型的变化趋势。', offsetMin: 0 },
          { role: 'expert', content: 'Top1 颗粒污染占比升至 38%（+6pp），与 etch 区 chamber 清洁周期延长相关；Top2 划痕类稳定；Top3 尺寸偏差略有抬头，建议关注光刻对准。', offsetMin: 5 },
          { role: 'user', content: '颗粒污染上升这么快，和哪条产线关联最强？', offsetMin: 18 },
          { role: 'expert', content: '关联最强的是 Line-A etch 段，占颗粒污染增量的 72%。该线 3 号 chamber 清洁周期从 48h 延长至 72h 后，缺陷率同步抬头。', offsetMin: 26 },
          { role: 'user', content: '能否给出一份简要摘要方便汇报？', offsetMin: 40 },
          { role: 'expert', content: '已输出《缺陷 pareto 解读摘要》，包含 Top3 占比变化、关联产线及建议措施，可直接用于周会汇报。', offsetMin: 48 }
        ],
        artifacts: [
          { title: '缺陷 pareto 解读摘要', content: 'Top1 颗粒污染 38%↑ | Top2 划痕 22% | Top3 尺寸偏差 15%↑', type: 'data' }
        ]
      },
      {
        title: '产线爬坡瓶颈工序识别',
        status: 'pending',
        daysAgo: 4, hour: 11, minute: 30,
        messages: [
          { role: 'user', content: '新产线爬坡第四周，产出仍未达计划 85%，请帮忙识别瓶颈工序。', offsetMin: 0 },
          { role: 'expert', content: '初步判断瓶颈在 CVD 沉积与 CMP 抛光两段：CVD 设备利用率 94% 且 queue time 超标，CMP 返工率 8.2% 偏高。建议优先优化 CVD 换腔节拍。', offsetMin: 6 },
          { role: 'user', content: 'CVD 换腔节拍目前是多少？优化空间有多大？', offsetMin: 22 },
          { role: 'expert', content: '当前换腔节拍 42 分钟，行业标杆约 28 分钟。通过并行预清洁 + 快换工装，预估可压缩至 32 分钟，产出可提升约 6%。', offsetMin: 30 },
          { role: 'user', content: 'CMP 返工率高是什么原因？', offsetMin: 48 },
          { role: 'expert', content: 'CMP 返工主因是抛光垫寿命管理不足（当前已超 85% 寿命仍在使用）及 slurry 流量波动。建议同步更换抛光垫并校准流量控制器。', offsetMin: 56 }
        ],
        artifacts: []
      },
      {
        title: 'SPC 异常点处理方案',
        status: 'pending',
        daysAgo: 5, hour: 8, minute: 55,
        messages: [
          { role: 'user', content: 'etch-3 站点 SPC 出现连续 3 点超 UCL，请给出处理方案。', offsetMin: 0 },
          { role: 'expert', content: '建议：① 立即冻结该 chamber 产品流 ② 复测最近 2 批次 ③ 核查 pressure / RF power 设定 ④ 确认后恢复并加严 Cpk 监控。', offsetMin: 3 },
          { role: 'user', content: '冻结后预计影响多少产能？有没有临时绕行方案？', offsetMin: 16 },
          { role: 'expert', content: '冻结 etch-3 预计影响日产约 120 片（约 8% 产能）。可临时将产品分流至 etch-1/etch-2，但需确认 recipe 兼容性，建议先跑 5 片验证。', offsetMin: 24 },
          { role: 'user', content: '请整理一份正式处置单。', offsetMin: 38 },
          { role: 'expert', content: '已生成《SPC 异常处置单》，包含异常描述、冻结范围、复测计划及恢复条件，请质量部门签字确认后执行。', offsetMin: 44 }
        ],
        artifacts: [
          { title: 'SPC 异常处置单', content: '站点：etch-3 | 异常：连续 3 点超 UCL | 处置：停线复测 + 参数核查', type: 'document' }
        ]
      }
      ],
      '2': [
        {
          title: '小样本缺陷增量训练',
          status: 'running',
          minutesAgo: 18,
          messages: [
            { role: 'user', content: '产线新增了 3 类罕见缺陷，样本各不足 50 张，请启动增量训练。', offsetMin: 0 },
            { role: 'expert', content: '建议采用少样本微调 + 合成数据增强策略。请确认是否可授权访问近 30 天 AOI 原图库。', offsetMin: 3 },
            { role: 'user', content: '已授权，原图库路径和新增缺陷样本标签已上传。', offsetMin: 7 },
            { role: 'expert', content: '正在加载样本并构建增强 pipeline，完成后将输出增量训练方案与预估指标…', offsetMin: 10 }
          ],
          artifacts: []
        },
        {
          title: '质检 AI 模型上线评估',
          status: 'pending',
          daysAgo: 1, hour: 10, minute: 15,
          messages: [
            { role: 'user', content: 'AOI 缺陷检测模型已完成训练，请评估是否满足产线上线标准。', offsetMin: 0 },
            { role: 'expert', content: '验证集准确率 97.2%、漏检率 0.8%，满足上线门槛。建议先灰度 2 条线跑 1 周，同步监控误报率与推理耗时。', offsetMin: 5 },
            { role: 'user', content: '误报率目前是多少？灰度期间怎么设阈值？', offsetMin: 18 },
            { role: 'expert', content: '当前误报率 2.1%，略高于 2% 目标。灰度期建议将置信度阈值从 0.85 提至 0.88，牺牲约 0.3% 召回换取误报下降。', offsetMin: 26 },
            { role: 'user', content: '推理耗时在产线节拍内吗？', offsetMin: 42 },
            { role: 'expert', content: '工控机端 P99 延迟 95ms，满足 120ms 节拍要求。已输出《模型上线评估报告》供评审会使用。', offsetMin: 50 }
          ],
          artifacts: [
            { title: '模型上线评估报告', content: '准确率 97.2% | 漏检 0.8% | 建议：灰度 2 线 × 1 周', type: 'report' }
          ]
        },
        {
          title: '边缘推理延迟优化方案',
          status: 'pending',
          daysAgo: 3, hour: 15, minute: 40,
          messages: [
            { role: 'user', content: '工控机端推理 P99 延迟 180ms，超出 120ms 目标，请给出优化方向。', offsetMin: 0 },
            { role: 'expert', content: '建议：① INT8 量化 ② TensorRT 引擎固化 ③ ROI 裁剪减输入分辨率。预估可将 P99 压至 95ms 以内。', offsetMin: 4 },
            { role: 'user', content: '量化后精度损失能接受吗？', offsetMin: 20 },
            { role: 'expert', content: 'INT8 量化后验证集准确率从 97.2% 降至 96.8%，漏检率从 0.8% 升至 0.9%，仍在可接受范围内。', offsetMin: 28 },
            { role: 'user', content: '三项优化的优先级怎么排？', offsetMin: 44 },
            { role: 'expert', content: '建议顺序：ROI 裁剪（收益最大，1 天可完成）→ TensorRT 固化（2 天）→ INT8 量化（需回归测试，3 天）。合计预估 1 周内达标。', offsetMin: 52 }
          ],
          artifacts: []
        }
      ],
      '3': [
        {
          title: '4 号回流焊温区漂移排查',
          status: 'running',
          minutesAgo: 25,
          messages: [
            { role: 'user', content: '4 号回流焊炉温曲线近 2 天出现峰值漂移，请帮忙排查。', offsetMin: 0 },
            { role: 'expert', content: '请提供最近 3 次炉温曲线截图及对应产品批次号，我先比对温区 3、温区 5 的设定与实际偏差。', offsetMin: 2 },
            { role: 'user', content: '已上传 3 份炉温曲线和批次记录。', offsetMin: 6 },
            { role: 'expert', content: '初步发现温区 5 实测峰值偏高 8℃，正在关联热电偶校准记录与风速设定…', offsetMin: 9 }
          ],
          artifacts: []
        },
        {
          title: '3 号贴片机振动异常诊断',
          status: 'pending',
          daysAgo: 2, hour: 8, minute: 30,
          messages: [
            { role: 'user', content: 'SMT 3 号贴片机近 3 天振动值持续偏高，请帮忙诊断。', offsetMin: 0 },
            { role: 'expert', content: '振动频谱显示 42Hz 主峰增强，指向 Z 轴丝杠磨损。建议安排停机检查导轨润滑与丝杠间隙，并备件预采。', offsetMin: 5 },
            { role: 'user', content: '能继续带病运行吗？预计还能撑多久？', offsetMin: 18 },
            { role: 'expert', content: '当前振动值 4.2mm/s，已超预警线 3.5mm/s。预估还可运行 3~5 天，但贴装精度可能下降，建议本周五夜班安排停机点检。', offsetMin: 26 },
            { role: 'user', content: '丝杠备件有库存吗？', offsetMin: 40 },
            { role: 'expert', content: '查过备件库，Z 轴丝杠组件库存 1 套，够用。已输出振动频谱分析摘要，可附在维修工单中。', offsetMin: 48 }
          ],
          artifacts: [
            { title: '振动频谱分析摘要', content: '主峰 42Hz ↑ | 疑似 Z 轴丝杠磨损 | 建议停机点检', type: 'data' }
          ]
        },
        {
          title: '关键备件安全库存测算',
          status: 'pending',
          daysAgo: 4, hour: 13, minute: 5,
          messages: [
            { role: 'user', content: '请根据近半年故障记录，测算贴片头、真空泵两类关键备件的安全库存。', offsetMin: 0 },
            { role: 'expert', content: '贴片头建议安全库存 4 套（lead time 14 天 + 月均消耗 6 套）；真空泵建议 2 台，并设 A 类件周巡检。', offsetMin: 6 },
            { role: 'user', content: '测算依据是什么？有没有考虑季节性波动？', offsetMin: 20 },
            { role: 'expert', content: '基于近 6 个月 MTBF 与消耗记录，按 95% 服务水平计算。Q3 高温季节故障率通常上浮 15%，已将贴片头安全库存上浮 1 套。', offsetMin: 28 },
            { role: 'user', content: '真空泵有没有替代型号可以缩短 lead time？', offsetMin: 44 },
            { role: 'expert', content: '有，B 品牌兼容型号 lead time 仅 7 天，价格贵 12%。建议真空泵维持 2 台安全库存 + 签约 B 品牌应急供货协议。', offsetMin: 52 }
          ],
          artifacts: []
        }
      ],
      '4': [
        {
          title: '客户 A 紧急订单交期评估',
          status: 'running',
          minutesAgo: 8,
          messages: [
            { role: 'user', content: '客户 A 追加 5000 件急单，要求 10 天内交付，请评估可行性。', offsetMin: 0 },
            { role: 'expert', content: '收到。正在拉取当前产能负荷、在制品库存与关键物料到货计划，请稍候。', offsetMin: 1 },
            { role: 'user', content: 'B 料是瓶颈物料，供应商确认 5 天后到货 3000 件。', offsetMin: 4 },
            { role: 'expert', content: '已纳入 B 料到货信息，正在仿真 10 天内的排产方案与 OTIF 概率…', offsetMin: 6 }
          ],
          artifacts: []
        },
        {
          title: 'Q3 多 SKU 需求预测校准',
          status: 'pending',
          daysAgo: 1, hour: 16, minute: 50,
          messages: [
            { role: 'user', content: 'Q3 需求预测偏差偏大，请结合最新订单与渠道反馈做一轮校准。', offsetMin: 0 },
            { role: 'expert', content: '已纳入 6 月促销与海外订单增量，Top20 SKU 预测上调 8%~12%。建议对长尾 SKU 维持保守策略，避免呆滞。', offsetMin: 5 },
            { role: 'user', content: '上调幅度最大的几个 SKU 是哪些？', offsetMin: 18 },
            { role: 'expert', content: '上调幅度前三：SKU-A12（+12%，海外大单）、SKU-B07（+10%，渠道补货）、SKU-C33（+9%，促销拉动）。三者合计占 Q3 增量 58%。', offsetMin: 26 },
            { role: 'user', content: '长尾 SKU 有没有需要特别关注的呆滞风险？', offsetMin: 42 },
            { role: 'expert', content: '有 8 个长尾 SKU 库存周转超 90 天，建议维持原预测不下调，但暂停补货直至库存消化至 60 天以内。已输出校准摘要。', offsetMin: 50 }
          ],
          artifacts: [
            { title: 'Q3 预测校准摘要', content: 'Top20 SKU 上调 8%~12% | 长尾 SKU 维持保守', type: 'report' }
          ]
        },
        {
          title: '华南工厂物料调拨方案',
          status: 'pending',
          daysAgo: 3, hour: 11, minute: 20,
          messages: [
            { role: 'user', content: '华东缺料、华南有余，请输出未来两周跨厂调拨建议。', offsetMin: 0 },
            { role: 'expert', content: '建议调拨 A 料 1200 件、C 料 800 件，走陆运 2 日达。调拨后华东 OTIF 可回升至 94%。', offsetMin: 4 },
            { role: 'user', content: '调拨成本大概多少？有没有更经济的方案？', offsetMin: 16 },
            { role: 'expert', content: '陆运调拨成本约 1.2 万元。若 A 料紧急程度不高，可拆分为海运 800 件（省 40% 运费）+ 陆运 400 件应急，综合 OTIF 约 92%。', offsetMin: 24 },
            { role: 'user', content: '华南调拨后自身库存够不够？', offsetMin: 38 },
            { role: 'expert', content: '调拨后华南 A 料仍余 15 天安全库存，C 料余 22 天，不影响本地交付。建议本周内完成调拨审批。', offsetMin: 46 }
          ],
          artifacts: []
        }
      ],
      '5': [
        {
          title: '8D 报告起草（客诉 #2024-089）',
          status: 'running',
          minutesAgo: 15,
          messages: [
            { role: 'user', content: '客诉 #2024-089 需要本周五前提交 8D 报告，请帮忙起草。', offsetMin: 0 },
            { role: 'expert', content: '请提供客诉描述、不良样本照片、批次追溯信息及当前临时围堵措施。', offsetMin: 2 },
            { role: 'user', content: '已上传客诉单、样本照片和批次追溯表，临时围堵为冻结同批次库存。', offsetMin: 5 },
            { role: 'expert', content: '正在整理 D2~D4 问题描述与围堵措施章节，并交叉比对同批次 SPC 记录…', offsetMin: 8 }
          ],
          artifacts: []
        },
        {
          title: '客诉闭环流程优化建议',
          status: 'pending',
          daysAgo: 2, hour: 14, minute: 0,
          messages: [
            { role: 'user', content: '近期客诉平均闭环周期 12 天，请梳理流程瓶颈并给出优化建议。', offsetMin: 0 },
            { role: 'expert', content: '主要瓶颈在责任判定与 8D 评审排队。建议引入分级响应：A 类 48h 初响、B 类 72h，并设质量工程师值班评审。', offsetMin: 5 },
            { role: 'user', content: '责任判定平均耗时多少？卡在哪个环节？', offsetMin: 18 },
            { role: 'expert', content: '责任判定平均 4.2 天，主要卡在跨部门确认（生产 ↔ 质量 ↔ 供应链三方会签）。建议 A 类客诉启用「先响应后追责」机制，24h 内先给客户初步答复。', offsetMin: 26 },
            { role: 'user', content: '优化后预计闭环周期能压到多少？', offsetMin: 40 },
            { role: 'expert', content: '引入分级响应 + 值班评审后，预估 A 类 5 天、B 类 8 天、整体均值可压至 7 天。已整理优化要点文档。', offsetMin: 48 }
          ],
          artifacts: [
            { title: '客诉闭环优化要点', content: 'A 类 48h 初响 | B 类 72h | 增设值班评审', type: 'document' }
          ]
        },
        {
          title: 'SPC 控制图判异规则梳理',
          status: 'pending',
          daysAgo: 5, hour: 9, minute: 10,
          messages: [
            { role: 'user', content: '各车间 SPC 判异规则不统一，请整理一版标准判异规则供推广。', offsetMin: 0 },
            { role: 'expert', content: '建议采用 Western Electric 八规则子集：连续 3 点同侧、连续 6 点递增/递减、单点超 3σ 等，并附处置流程模板。', offsetMin: 4 },
            { role: 'user', content: '八条规则会不会太敏感？产线抱怨误报多。', offsetMin: 16 },
            { role: 'expert', content: '建议首期推广 5 条核心规则（规则 1/2/3/5/8），其余 3 条作为可选加严项。核心 5 条在试点车间误报率约 3%，可接受。', offsetMin: 24 },
            { role: 'user', content: '处置流程模板包含哪些内容？', offsetMin: 38 },
            { role: 'expert', content: '模板包含：异常描述 → 初步判定 → 冻结/放行决策 → 根因分析 → 纠正措施 → 验证关闭，共 6 步，每步有标准时限和责任人字段。', offsetMin: 46 }
          ],
          artifacts: []
        }
      ],
      '6': [
        {
          title: 'WMS 库位策略优化',
          status: 'running',
          minutesAgo: 22,
          messages: [
            { role: 'user', content: '仓库拣货效率低，请帮忙优化库位分配策略。', offsetMin: 0 },
            { role: 'expert', content: '需要近 3 个月出库频次、SKU 关联度和当前库位热力图。您可授权 WMS 导出或手动上传。', offsetMin: 3 },
            { role: 'user', content: '已授权 WMS 导出，热力图和出库频次表已同步。', offsetMin: 7 },
            { role: 'expert', content: '正在聚类分析高频 SKU 并生成库位重排建议，预计可减少平均拣货路径 18%…', offsetMin: 10 }
          ],
          artifacts: []
        },
        {
          title: 'MES 与 QMS 数据打通方案',
          status: 'pending',
          daysAgo: 2, hour: 10, minute: 45,
          messages: [
            { role: 'user', content: '质检结果目前无法自动回写 MES 工单，请给出系统打通方案。', offsetMin: 0 },
            { role: 'expert', content: '建议通过中间件订阅 QMS 检验完成事件，映射 lot / step 回写 MES。首期覆盖终检与 OQC 两个节点，预计 3 周完成联调。', offsetMin: 5 },
            { role: 'user', content: 'MES 和 QMS 的接口协议兼容吗？需要改造哪一侧？', offsetMin: 18 },
            { role: 'expert', content: 'QMS 支持 REST 事件推送，MES 需新增一个接收端点（约 2 人天开发）。数据映射表需质量与 IT 联合确认 lot/step 字段对应关系。', offsetMin: 26 },
            { role: 'user', content: '联调期间怎么保证不影响现有产线？', offsetMin: 40 },
            { role: 'expert', content: '建议采用影子模式：中间件先并行接收 QMS 事件并记录日志，不实际回写 MES，验证 1 周无误后再切换正式回写。已整理实施路径文档。', offsetMin: 48 }
          ],
          artifacts: [
            { title: '系统打通实施路径', content: '事件订阅 → lot/step 映射 → MES 回写 | 首期 3 周', type: 'document' }
          ]
        },
        {
          title: '主数据治理规范起草',
          status: 'pending',
          daysAgo: 4, hour: 14, minute: 30,
          messages: [
            { role: 'user', content: '各系统物料编码不统一，请帮忙起草一版主数据治理规范。', offsetMin: 0 },
            { role: 'expert', content: '建议以 ERP 物料主数据为源头，MES/WMS/QMS 通过编码映射表同步。规范需覆盖编码规则、变更审批、质量校验三个章节。', offsetMin: 6 },
            { role: 'user', content: '历史数据清洗工作量有多大？', offsetMin: 20 },
            { role: 'expert', content: '初步估算约 1.2 万条物料编码需人工核对，其中 15% 存在一对多映射。建议分三期：核心物料 2 周、通用物料 4 周、长尾物料 6 周。', offsetMin: 28 },
            { role: 'user', content: '变更审批流程怎么设计？', offsetMin: 44 },
            { role: 'expert', content: '建议三级审批：申请人 → 数据管理员审核 → IT 主数据负责人发布。紧急变更设 4h 快速通道，但需事后补审。', offsetMin: 52 }
          ],
          artifacts: [
            { title: '主数据治理规范草案', content: '编码规则 | 变更审批 | 质量校验 | 分三期清洗计划', type: 'document' }
          ]
        }
      ],
      '7': [
        {
          title: '光伏二期并网节能测算',
          status: 'running',
          minutesAgo: 10,
          messages: [
            { role: 'user', content: '光伏二期若 11 月并网，请测算全年节电量与碳减排贡献。', offsetMin: 0 },
            { role: 'expert', content: '请提供组件装机容量、当地日照时数及并网后自用比例预估。', offsetMin: 2 },
            { role: 'user', content: '装机 1.2 MW，自用比约 85%，日照数据已上传。', offsetMin: 5 },
            { role: 'expert', content: '正在按月度发电量模型仿真并折算节电量与碳减排量…', offsetMin: 7 }
          ],
          artifacts: []
        },
        {
          title: '空压站群控节能改造评估',
          status: 'pending',
          daysAgo: 1, hour: 9, minute: 0,
          messages: [
            { role: 'user', content: '工厂 3 台空压机并行运行，能耗偏高，请评估群控改造可行性。', offsetMin: 0 },
            { role: 'expert', content: '当前 3 台机组负载率分别为 45%、38%、52%，存在明显低效并行。群控改造后预计可降至 1~2 台运行，年节电约 18 万 kWh。', offsetMin: 5 },
            { role: 'user', content: '改造投资和回收期大概多少？', offsetMin: 18 },
            { role: 'expert', content: '群控 PLC + 压力优化算法 + 管路改造，总投资约 28 万元。按当前电价测算，回收期约 2.3 年。', offsetMin: 26 },
            { role: 'user', content: '改造期间能保证供气不间断吗？', offsetMin: 40 },
            { role: 'expert', content: '可以。建议利用周末停产窗口施工，保留 1 台机组手动模式作为备用，改造周期约 3 天。', offsetMin: 48 }
          ],
          artifacts: [
            { title: '空压站节能改造方案', content: '年节电 18 万 kWh | 投资 28 万 | 回收期 2.3 年', type: 'report' }
          ]
        },
        {
          title: '年度碳排放核算',
          status: 'pending',
          daysAgo: 3, hour: 11, minute: 15,
          messages: [
            { role: 'user', content: '请根据上半年能耗数据，完成年度碳排放初步核算。', offsetMin: 0 },
            { role: 'expert', content: '上半年 Scope 1+2 碳排放约 4,280 tCO₂e，同比降 3.2%。主要减排来自空压站优化与照明 LED 改造。', offsetMin: 6 },
            { role: 'user', content: '下半年预测会怎样？离年度目标差多少？', offsetMin: 20 },
            { role: 'expert', content: '按当前趋势，全年预估 8,650 tCO₂e，距年度目标 8,400 tCO₂e 还差 250 tCO₂e。建议 Q4 推进光伏二期（预估减排 180 tCO₂e）。', offsetMin: 28 },
            { role: 'user', content: '光伏二期进度如何？', offsetMin: 42 },
            { role: 'expert', content: '可研已完成，正在走采购审批。若 9 月开工、11 月并网，可贡献约 2 个月发电量，基本弥补缺口。', offsetMin: 50 }
          ],
          artifacts: [
            { title: '碳排放核算摘要', content: '上半年 4,280 tCO₂e | 全年预估 8,650 | 缺口 250 tCO₂e', type: 'data' }
          ]
        }
      ],
      '8': [
        {
          title: '车间动火作业许可流程审核',
          status: 'running',
          minutesAgo: 30,
          messages: [
            { role: 'user', content: '焊接车间明天有动火作业，请审核作业许可申请材料。', offsetMin: 0 },
            { role: 'expert', content: '请提交动火申请表、可燃气体检测报告、消防器材配置清单和监护人资质。', offsetMin: 2 },
            { role: 'user', content: '材料已上传，气体检测合格，监护人持证上岗。', offsetMin: 6 },
            { role: 'expert', content: '正在逐项核对动火等级、隔离措施和应急方案，完成后给出审核意见…', offsetMin: 9 }
          ],
          artifacts: []
        },
        {
          title: '危化品库房风险辨识',
          status: 'pending',
          daysAgo: 2, hour: 10, minute: 20,
          messages: [
            { role: 'user', content: '危化品库房即将到期复检，请帮忙做一次风险辨识。', offsetMin: 0 },
            { role: 'expert', content: '辨识出 3 项较大风险：通风系统老化（L=4,S=3）、防静电接地电阻超标（L=3,S=4）、应急喷淋覆盖盲区（L=3,S=3）。', offsetMin: 6 },
            { role: 'user', content: '通风系统老化具体是什么问题？', offsetMin: 18 },
            { role: 'expert', content: '排风机运行 8 年，风量实测仅为设计值 72%，夏季高温时库房温湿度易超标。建议更换 2 台排风机并加装温湿度联动控制。', offsetMin: 26 },
            { role: 'user', content: '整改优先级和时限怎么排？', offsetMin: 40 },
            { role: 'expert', content: '防静电接地（30 天内）→ 通风改造（60 天内）→ 喷淋盲区（90 天内）。前两项为复检硬性要求，需优先完成。', offsetMin: 48 }
          ],
          artifacts: [
            { title: '危化品库房风险清单', content: '3 项较大风险 | 整改时限 30/60/90 天', type: 'document' }
          ]
        },
        {
          title: '新员工安全培训体系搭建',
          status: 'pending',
          daysAgo: 5, hour: 15, minute: 0,
          messages: [
            { role: 'user', content: '产线新员工流失率高，安全培训效果不佳，请帮忙设计培训体系。', offsetMin: 0 },
            { role: 'expert', content: '建议「三级培训」：公司级（4h 法规意识）→ 车间级（4h 现场风险）→ 岗位级（8h 实操考核）。每级设通关测试，不通过不得上岗。', offsetMin: 5 },
            { role: 'user', content: '岗位级实操考核怎么设计？', offsetMin: 18 },
            { role: 'expert', content: '每个岗位设 10 项标准操作检查点（PPE 穿戴、设备启停、异常处置等），由班组长现场打分，80 分及格。建议制作实操视频供反复学习。', offsetMin: 26 },
            { role: 'user', content: '培训记录怎么数字化管理？', offsetMin: 40 },
            { role: 'expert', content: '可在现有 EHS 系统中新增培训模块，扫码签到 + 在线考试 + 实操评分一体化。员工档案自动关联培训记录，到期自动提醒复训。', offsetMin: 48 }
          ],
          artifacts: []
        }
      ],
      '9': [
        {
          title: '工位 8 视觉检测工站部署',
          status: 'running',
          minutesAgo: 6,
          messages: [
            { role: 'user', content: '工位 8 计划部署视觉检测工站，请评估相机选型与节拍影响。', offsetMin: 0 },
            { role: 'expert', content: '请提供检测缺陷类型、视野范围和当前工位节拍（目前 45s）。', offsetMin: 1 },
            { role: 'user', content: '主要检螺丝漏拧和标签偏位，视野约 120×80mm，节拍 45s。', offsetMin: 3 },
            { role: 'expert', content: '正在比选 200 万 vs 500 万像素方案并估算检测耗时对节拍的占用…', offsetMin: 5 }
          ],
          artifacts: []
        },
        {
          title: '协作机器人产线布局优化',
          status: 'pending',
          daysAgo: 1, hour: 13, minute: 40,
          messages: [
            { role: 'user', content: '装配线计划引入 2 台协作机器人，请帮忙优化工位布局。', offsetMin: 0 },
            { role: 'expert', content: '建议在工位 3 和工位 7 各部署 1 台，分别负责螺丝拧紧和视觉检测。两工位间距需 ≥ 1.2m 以满足人机安全距离。', offsetMin: 5 },
            { role: 'user', content: '工位 3 空间有限，能放得下吗？', offsetMin: 18 },
            { role: 'expert', content: '工位 3 当前宽 1.8m，拆除左侧备用料架后可腾出 0.6m，足够部署 UR5e（占地约 0.5m）。建议将料架移至线边仓。', offsetMin: 26 },
            { role: 'user', content: '人机协作的安全认证需要什么？', offsetMin: 40 },
            { role: 'expert', content: '需完成风险评估（ISO 10218）和 CE 符合性声明。协作模式下机器人速度限制 250mm/s，配备力矩传感与急停双回路。预计认证周期 4 周。', offsetMin: 48 }
          ],
          artifacts: [
            { title: '协作机器人布局方案', content: '工位 3/7 各 1 台 | 安全距离 ≥ 1.2m | 认证周期 4 周', type: 'report' }
          ]
        },
        {
          title: 'AGV 调度算法调优',
          status: 'pending',
          daysAgo: 3, hour: 16, minute: 10,
          messages: [
            { role: 'user', content: '仓库 5 台 AGV 高峰期频繁拥堵，请帮忙调优调度算法。', offsetMin: 0 },
            { role: 'expert', content: '当前采用先到先得（FCFS）策略，高峰期 5 台 AGV 在交叉口等待平均 42 秒。建议切换为优先级 + 动态路径规划，预估等待降至 15 秒。', offsetMin: 5 },
            { role: 'user', content: '动态路径规划会不会增加行驶距离？', offsetMin: 18 },
            { role: 'expert', content: '单趟平均行驶距离增加约 8%，但等待时间减少 64%，综合吞吐量提升 22%。电量消耗基本持平。', offsetMin: 26 },
            { role: 'user', content: '调优需要停机吗？', offsetMin: 40 },
            { role: 'expert', content: '不需要。可在夜间低峰期热切换调度策略，先用 1 台 AGV 跑影子模式验证 2 天，确认无异常后全量切换。', offsetMin: 48 }
          ],
          artifacts: [
            { title: 'AGV 调度优化报告', content: 'FCFS → 优先级+动态路径 | 吞吐量 +22% | 等待 -64%', type: 'data' }
          ]
        },
        {
          title: '柔性产线节拍平衡分析',
          status: 'pending',
          daysAgo: 6, hour: 9, minute: 30,
          messages: [
            { role: 'user', content: '柔性产线换型后节拍从 45s 升至 58s，请分析瓶颈工位。', offsetMin: 0 },
            { role: 'expert', content: '瓶颈在工位 5（人工装配）和工位 8（检测），工时分别为 22s 和 18s，均超节拍 45s 的 50% 阈值。', offsetMin: 5 },
            { role: 'user', content: '工位 5 有什么优化空间？', offsetMin: 16 },
            { role: 'expert', content: '工位 5 可引入协作机器人辅助拧紧（节省 8s），同时将辅料预组装置移至工位 4（节省 3s），合计可压至 11s。', offsetMin: 24 },
            { role: 'user', content: '优化后整条线节拍能到多少？', offsetMin: 38 },
            { role: 'expert', content: '工位 5 优化后，新瓶颈为工位 8（18s），线平衡率从 72% 提升至 89%，节拍可恢复至 46s，接近目标。', offsetMin: 46 }
          ],
          artifacts: []
        }
      ]
    };
    return bundles[String(expertId)] || [];
  }

  function addDemoDialogueTask(expertId, def) {
    var createdAt = resolveDemoTaskCreatedAt(def);
    var task = {
      id: uid(),
      title: def.title,
      type: 'dialogue',
      status: def.status || 'pending',
      expertId: expertId,
      ownerId: 'admin',
      archived: false,
      titleSet: true,
      createdAt: createdAt,
      updatedAt: createdAt
    };
    state.tasks.unshift(task);
    var demoMessages = buildDemoMessages(def, createdAt, expertId);
    state.messages[task.id] = demoMessages;
    if (demoMessages.length) {
      task.updatedAt = demoMessages[demoMessages.length - 1].createdAt;
    }
    (def.artifacts || []).forEach(function (a) {
      if (!state.taskArtifacts) state.taskArtifacts = [];
      state.taskArtifacts.unshift({
        id: uid(),
        taskId: task.id,
        title: a.title,
        content: a.content || '',
        type: a.type || 'document',
        createdAt: createdAt
      });
    });
    return task;
  }

  function ensureDemoDialogueTasks(expertId) {
    if (!expertId) return false;
    var updated = false;
    getDemoDialogueTaskBundle(expertId).forEach(function (def) {
      var exists = state.tasks.some(function (t) {
        return t.expertId === expertId && t.type === 'dialogue' && t.title === def.title;
      });
      if (!exists) {
        addDemoDialogueTask(expertId, def);
        updated = true;
      }
    });
    return updated;
  }

  function migrateExpertDialogueTasks() {
    var updated = false;
    state.experts.forEach(function (e) {
      if (getDemoDialogueTaskBundle(e.id).length && ensureDemoDialogueTasks(e.id)) {
        updated = true;
      }
    });
    if (updated) persist();
  }

  function syncDemoDialogueArtifacts(task, def, baseIso) {
    if (!def.artifacts || !def.artifacts.length) return false;
    if (!state.taskArtifacts) state.taskArtifacts = [];
    var changed = false;
    def.artifacts.forEach(function (a) {
      var exists = state.taskArtifacts.some(function (x) {
        return x.taskId === task.id && x.title === a.title;
      });
      if (!exists) {
        state.taskArtifacts.unshift({
          id: uid(),
          taskId: task.id,
          title: a.title,
          content: a.content || '',
          type: a.type || 'document',
          createdAt: baseIso
        });
        changed = true;
      }
    });
    return changed;
  }

  function shouldSyncDemoMessages(task, def, current, expected) {
    if (!expected.length) return false;
    var enriched = enrichMessagesWithExpertFlow(expected, task.expertId);
    if (!taskMessagesHaveRichTypes(current)) return true;
    if (current.length < enriched.length) return true;
    if (def.status === 'running') {
      if (task.status !== 'running') return true;
      if (current.length !== enriched.length) return true;
      var lastExpected = enriched[enriched.length - 1];
      var lastCurrent = current[current.length - 1];
      if (!lastCurrent || lastCurrent.content !== lastExpected.content) return true;
    }
    return false;
  }

  function migrateExpertDialogueMessages() {
    var updated = false;
    state.experts.forEach(function (e) {
      getDemoDialogueTaskBundle(e.id).forEach(function (def) {
        var task = state.tasks.find(function (t) {
          return String(t.expertId) === String(e.id) && t.type === 'dialogue' && t.title === def.title;
        });
        if (!task) return;
        var expected = def.messages || [];
        var current = state.messages[task.id] || [];
        var baseIso = task.createdAt || resolveDemoTaskCreatedAt(def);
        if (shouldSyncDemoMessages(task, def, current, expected)) {
          var demoMessages = buildDemoMessages(def, baseIso, e.id);
          state.messages[task.id] = demoMessages;
          task.updatedAt = demoMessages[demoMessages.length - 1].createdAt;
          updated = true;
        }
        if (def.status && task.status !== def.status) {
          task.status = def.status;
          updated = true;
        }
        if (syncDemoDialogueArtifacts(task, def, baseIso)) updated = true;
      });
    });
    if (updated) persist();
  }

  function defaultState() {
    return {
      experts: [],
      favorites: [],
      personas: {},
      skillBindings: {},
      toolBindings: {},
      memories: [],
      tasks: [],
      messages: {},
      projects: [],
      projectMembers: [],
      projectMessages: {},
      projectOutputs: [],
      projectTasks: [],
      projectFiles: [],
      imChannels: {},
      permissions: {},
      workspaceFiles: {},
      taskArtifacts: []
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      return defaultState();
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = load();

  function persist() {
    save(state);
  }

  function migrateExpertRoleNames() {
    var seedMap = {};
    (window.EXPERTS_DATA || []).forEach(function (s) {
      seedMap[String(s.id)] = s.name;
    });
    var updated = false;
    state.experts.forEach(function (e) {
      if (seedMap[e.id] && e.name !== seedMap[e.id]) {
        e.name = seedMap[e.id];
        updated = true;
      } else if (e.position && e.name !== e.position) {
        e.name = e.position;
        updated = true;
      }
      if (e.position) {
        e.position = '';
        updated = true;
      }
    });
    if (updated) persist();
  }

  function seedIfEmpty() {
    if (state.experts.length > 0) return;

    const seedExperts = (window.EXPERTS_DATA || []).map(function (e) {
      return {
        id: String(e.id),
        name: e.name,
        avatar: e.avatar,
        description: e.description,
        expertise: e.expertise || [],
        category: e.category,
        visibility: 'public',
        status: 'active',
        updatedAt: e.updatedAt || nowIso()
      };
    });

    state.experts = seedExperts;
    state.favorites = seedExperts.filter(function (_, i) {
      return window.EXPERTS_DATA[i] && window.EXPERTS_DATA[i].favorited;
    }).map(function (e) { return e.id; });

    seedExperts.forEach(function (e) {
      state.personas[e.id] = {
        coreDutyMd: '## 核心职责\n\n负责「' + e.name + '」职责范围内的专业咨询与方案输出。',
        workflowMd: '## 工作流程\n\n1. 理解需求\n2. 收集数据\n3. 分析诊断\n4. 输出建议',
        behaviorMd: '## 行为准则\n\n- 基于事实与数据\n- 结论清晰可执行\n- 主动确认关键假设'
      };
      state.skillBindings[e.id] = [window.SKILLS_CATALOG[0].id];
      if (window.SKILLS_CATALOG[1]) state.skillBindings[e.id].push(window.SKILLS_CATALOG[1].id);
      state.toolBindings[e.id] = [window.TOOLS_CATALOG[0].id];
      state.memories.push({
        id: uid(),
        expertId: e.id,
        content: '用户偏好：优先关注可落地的短期改进措施。',
        scope: 'user',
        source: 'manual',
        createdAt: nowIso()
      });
    });

    var p1 = {
      id: uid(),
      name: '12寸产线良率提升项目',
      icon: '🏭',
      description: '针对近期良率波动，组织工艺、质量、设备专家联合攻关。',
      visibility: 'public',
      status: 'active',
      updatedAt: nowIso()
    };
    var p2 = {
      id: uid(),
      name: '供应链数字化规划',
      icon: '📊',
      description: '构建多工厂物料计划数字孪生模型，提升交付准时率。',
      visibility: 'public',
      status: 'active',
      updatedAt: nowIso()
    };
    state.projects = [p1, p2];

    if (seedExperts[0] && seedExperts[2] && seedExperts[4]) {
      state.projectMembers = [
        { id: uid(), projectId: p1.id, expertId: seedExperts[0].id, role: 'lead', progress: 80, progressSummary: '已完成根因分析，待验证', joinedAt: nowIso() },
        { id: uid(), projectId: p1.id, expertId: seedExperts[4].id, role: 'member', progress: 40, progressSummary: 'SPC 报告进行中', joinedAt: nowIso() },
        { id: uid(), projectId: p1.id, expertId: seedExperts[2].id, role: 'member', progress: 0, progressSummary: '待开始设备关联分析', joinedAt: nowIso() },
        { id: uid(), projectId: p2.id, expertId: seedExperts[3].id, role: 'lead', progress: 55, progressSummary: '需求预测模型已初版', joinedAt: nowIso() },
        { id: uid(), projectId: p2.id, expertId: seedExperts[5].id, role: 'member', progress: 30, progressSummary: '数据治理规范起草中', joinedAt: nowIso() }
      ];
      state.projectOutputs = [
        { id: uid(), projectId: p1.id, expertId: seedExperts[0].id, title: '良率波动根因分析报告 v1', content: '主要根因：etch 区 3 号 chamber 压力偏差 +12%。建议参数回标并加严 SPC 监控。', createdAt: nowIso() }
      ];
      var ptSpc = uid();
      var ptRoot = uid();
      var ptDevice = uid();
      state.projectTasks = [
        { id: ptSpc, projectId: p1.id, title: 'SPC 数据分析', status: 'queued', expertId: seedExperts[4].id, sortOrder: 0 },
        { id: ptRoot, projectId: p1.id, title: '良率根因分析', status: 'tool', expertId: seedExperts[0].id, sortOrder: 1 },
        { id: ptDevice, projectId: p1.id, title: '设备关联分析', status: 'thinking', expertId: seedExperts[2].id, sortOrder: 2 },
        { id: uid(), projectId: p2.id, title: '需求预测建模', status: 'running', expertId: seedExperts[3].id, sortOrder: 0 },
        { id: uid(), projectId: p2.id, title: '数据治理规范', status: 'running', expertId: seedExperts[5].id, sortOrder: 1 },
        { id: uid(), projectId: p2.id, title: '多工厂仿真验证', status: 'queued', expertId: null, sortOrder: 2 }
      ];
      state.projectFiles = [
        { id: uid(), projectId: p1.id, name: '良率波动根因分析.md', type: 'document', status: 'updating', expertId: seedExperts[0].id, content: '# 良率波动根因分析\n\n## 初步结论\netch 区 3 号 chamber 压力偏差 +12%…', updatedAt: nowIso() },
        { id: uid(), projectId: p1.id, name: 'SPC 控制图模板.xlsx', type: 'spreadsheet', status: 'ready', content: 'SPC 模板：UCL / LCL / 中心线参数占位', updatedAt: nowIso() },
        { id: uid(), projectId: p1.id, name: 'MES 良率原始数据.csv', type: 'data', status: 'ready', content: 'date,site,yield\n2026-05-01,etch-3,0.912', updatedAt: nowIso() }
      ];
      ensureProjectDemoMessages(p1.id);
      ensureProjectDemoMessages(p2.id);
    }

    seedExperts.forEach(function (e) {
      if (getDemoDialogueTaskBundle(e.id).length) ensureDemoDialogueTasks(e.id);
    });

    persist();
  }

  function migrateProjectsVisibility() {
    var updated = false;
    state.projects.forEach(function (p) {
      if (p.visibility === 'personal') {
        p.visibility = 'public';
        updated = true;
      }
    });
    if (updated) persist();
  }

  function defaultProjectTasksFor(p) {
    var members = state.projectMembers.filter(function (m) { return m.projectId === p.id; });
    if (p.name.indexOf('良率') >= 0 && members.length >= 2) {
      var lead = members[0];
      var device = members.find(function (m) { return m.expertId !== lead.expertId; }) || members[1];
      var quality = members.find(function (m) {
        return m.expertId !== lead.expertId && m.expertId !== device.expertId;
      }) || members[0];
      return [
        { id: uid(), projectId: p.id, title: 'SPC 数据分析', status: 'queued', expertId: quality.expertId, sortOrder: 0 },
        { id: uid(), projectId: p.id, title: '良率根因分析', status: 'running', expertId: lead.expertId, sortOrder: 1 },
        { id: uid(), projectId: p.id, title: '设备关联分析', status: 'running', expertId: device.expertId, sortOrder: 2 }
      ];
    }
    if (p.name.indexOf('供应链') >= 0 && members.length >= 2) {
      return [
        { id: uid(), projectId: p.id, title: '需求预测建模', status: 'running', expertId: members[0].expertId, sortOrder: 0 },
        { id: uid(), projectId: p.id, title: '数据治理规范', status: 'running', expertId: members[1].expertId, sortOrder: 1 },
        { id: uid(), projectId: p.id, title: '多工厂仿真验证', status: 'queued', expertId: null, sortOrder: 2 }
      ];
    }
    if (members.length === 0) {
      return [{ id: uid(), projectId: p.id, title: '任务拆解', status: 'queued', expertId: null, sortOrder: 0 }];
    }
    var genericTitles = ['数据收集', '分析报告', '评审闭环'];
    return members.map(function (m, i) {
      var expert = state.experts.find(function (e) { return e.id === m.expertId; });
      var status = m.progress >= 100 ? 'done' : (m.progress > 0 ? 'running' : 'queued');
      return {
        id: uid(),
        projectId: p.id,
        title: genericTitles[i % genericTitles.length],
        status: status,
        expertId: status === 'running' ? m.expertId : (m.expertId || null),
        sortOrder: i
      };
    });
  }

  var YIELD_TASK_TITLES = ['SPC 数据分析', '良率根因分析', '设备关联分析'];
  var SUPPLY_TASK_TITLES = ['需求预测建模', '数据治理规范', '多工厂仿真验证'];

  var PROJECT_TASK_TITLE_RENAMES = {
    '排查 etch 区近 4 周 SPC 异常点': 'SPC 数据分析',
    '撰写良率波动根因分析报告': '良率根因分析',
    '交叉验证 chamber PM 记录与良率关联': '设备关联分析',
    '训练多 SKU 需求预测模型': '需求预测建模',
    '编写供应链主数据治理规范': '数据治理规范',
    '执行多工厂物料计划仿真验证': '多工厂仿真验证',
    '拆解项目目标并分配子任务': '任务拆解',
    '执行分配工作项': null,
    '完成阶段调研与数据收集': '数据收集',
    '输出分析报告与改进建议': '分析报告',
    '组织评审并闭环验证事项': '评审闭环'
  };

  function stripExpertNamePrefix(title) {
    if (!title) return title;
    var changed = true;
    while (changed) {
      changed = false;
      state.experts.forEach(function (e) {
        if (changed || !e.name) return;
        if (title.indexOf(e.name + '：') === 0) {
          title = title.slice(e.name.length + 1);
          changed = true;
        } else if (title.indexOf(e.name + ':') === 0) {
          title = title.slice(e.name.length + 1);
          changed = true;
        }
      });
    }
    return title;
  }

  function normalizeProjectTaskTitle(t) {
    var title = stripExpertNamePrefix(t.title || '');
    if (PROJECT_TASK_TITLE_RENAMES[title] !== undefined) {
      title = PROJECT_TASK_TITLE_RENAMES[title];
    }
    if (title === '执行分配工作项' || title === null) {
      var project = state.projects.find(function (p) { return p.id === t.projectId; });
      var idx = t.sortOrder || 0;
      if (project && project.name.indexOf('良率') >= 0) title = YIELD_TASK_TITLES[idx % YIELD_TASK_TITLES.length];
      else if (project && project.name.indexOf('供应链') >= 0) title = SUPPLY_TASK_TITLES[idx % SUPPLY_TASK_TITLES.length];
      else title = ['数据收集', '分析报告', '评审闭环'][idx % 3];
    }
    if (title && title.indexOf('负责项') >= 0) {
      title = ['数据收集', '分析报告', '评审闭环'][(t.sortOrder || 0) % 3];
    }
    return title;
  }

  function migrateProjectTaskTitles() {
    var updated = false;
    (state.projectTasks || []).forEach(function (t) {
      var normalized = normalizeProjectTaskTitle(t);
      if (normalized && normalized !== t.title) {
        t.title = normalized;
        updated = true;
      }
    });
    if (updated) persist();
  }

  function migrateProjectTasks() {
    if (state.projectTasks && state.projectTasks.length > 0) return;
    state.projectTasks = [];
    state.projects.forEach(function (p) {
      defaultProjectTasksFor(p).forEach(function (t) { state.projectTasks.push(t); });
    });
    if (state.projectTasks.length) persist();
  }

  function defaultProjectFilesFor(p) {
    if (p.name.indexOf('良率') >= 0) {
      return [
        { id: uid(), projectId: p.id, name: '良率波动根因分析.md', type: 'document', status: 'updating', content: '# 良率波动根因分析\n\n撰写中…', updatedAt: nowIso() },
        { id: uid(), projectId: p.id, name: 'SPC 控制图模板.xlsx', type: 'spreadsheet', status: 'ready', content: 'SPC 模板占位', updatedAt: nowIso() }
      ];
    }
    if (p.name.indexOf('供应链') >= 0) {
      return [
        { id: uid(), projectId: p.id, name: '需求预测模型说明.md', type: 'document', status: 'updating', content: '# 需求预测模型\n\n初版说明…', updatedAt: nowIso() },
        { id: uid(), projectId: p.id, name: '数据治理规范草案.docx', type: 'document', status: 'ready', content: '数据治理规范草案', updatedAt: nowIso() }
      ];
    }
    return [];
  }

  function migrateProjectFiles() {
    if (state.projectFiles && state.projectFiles.length > 0) return;
    state.projectFiles = [];
    state.projects.forEach(function (p) {
      defaultProjectFilesFor(p).forEach(function (f) { state.projectFiles.push(f); });
    });
    if (state.projectFiles.length) persist();
  }

  function migrateProjectMessageTypes() {
    var updated = false;
    Object.keys(state.projectMessages || {}).forEach(function (pid) {
      (state.projectMessages[pid] || []).forEach(function (m) {
        if (!m.type) {
          m.type = m.role === 'system' ? 'chat' : 'chat';
          updated = true;
        }
      });
    });
    if (updated) persist();
  }

  function findProjectTaskId(projectId, title) {
    var task = (state.projectTasks || []).find(function (t) {
      return t.projectId === projectId && t.title === title;
    });
    return task ? task.id : null;
  }

  function findProjectMemberExpertId(projectId, role) {
    var member = (state.projectMembers || []).find(function (m) {
      return m.projectId === projectId && m.role === role;
    });
    return member ? member.expertId : null;
  }

  function getDemoProjectMessageDefs(project) {
    if (!project) return [];
    var pid = project.id;
    if (project.name.indexOf('良率') >= 0) {
      var eProcess = findProjectMemberExpertId(pid, 'lead') ||
        (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === '良率根因分析'; }) || {}).expertId;
      var eQuality = (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === 'SPC 数据分析'; }) || {}).expertId;
      var eDevice = (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === '设备关联分析'; }) || {}).expertId;
      var tRoot = findProjectTaskId(pid, '良率根因分析');
      var tSpc = findProjectTaskId(pid, 'SPC 数据分析');
      var tDevice = findProjectTaskId(pid, '设备关联分析');
      return [
        { role: 'system', type: 'chat', offsetMin: 0, content: '项目已创建，项目经理已拆解子任务，各位专家请同步进展。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 3, content: '请各位专家同步本周良率攻关进展，优先级：根因分析 → 设备关联 → SPC 数据。' },
        { role: 'user', type: 'chat', scope: 'group', taskId: tRoot, offsetMin: 8, content: '请工艺专家先输出良率波动根因摘要。' },
        { role: 'expert', type: 'chat', taskId: tRoot, expertId: eProcess, offsetMin: 12, content: '收到，已开始拉取 etch 区近 4 周良率数据，预计 30 分钟内给出初步判断。' },
        { role: 'expert', type: 'thought', taskId: tRoot, expertId: eProcess, offsetMin: 16, content: 'Thought: 需要先拉取近 4 周各站点良率趋势，对比 etch 区 chamber 参数变更记录，再交叉 SPC 异常点。' },
        { role: 'expert', type: 'action', taskId: tRoot, expertId: eProcess, toolName: 'MES 数据查询 API', offsetMin: 20, content: '正在调用 [MES 数据查询 API] 获取 etch 区良率时序数据…' },
        { role: 'expert', type: 'chat', taskId: tRoot, expertId: eProcess, offsetMin: 28, content: '初步判断与 etch 区 3 号 chamber 压力漂移相关（+12%），详细报告今日内提交。' },
        { role: 'user', type: 'chat', targetExpertId: eQuality, taskId: tSpc, offsetMin: 38, content: '质量专家，SPC 异常点排查进展如何？' },
        { role: 'expert', type: 'thought', taskId: tSpc, expertId: eQuality, offsetMin: 42, content: 'Thought: 需先确认 etch-3 站点控制图异常规则命中情况，再更新缺陷 pareto 对比上周。' },
        { role: 'expert', type: 'chat', taskId: tSpc, expertId: eQuality, offsetMin: 48, content: '已锁定 etch-3 连续 3 点超 UCL，正在生成更新版缺陷 pareto。' },
        { role: 'expert', type: 'action', taskId: tSpc, expertId: eQuality, toolName: 'SPC 分析工具', offsetMin: 55, content: '正在调用 [SPC 分析工具] 生成 etch-3 控制图与判异报告…' },
        { role: 'expert', type: 'chat', taskId: tSpc, expertId: eQuality, offsetMin: 62, content: 'Top1 颗粒污染占比升至 38%（+6pp），与工艺专家判断一致，建议同步加严清洁周期。' },
        { role: 'expert', type: 'thought', taskId: tDevice, expertId: eDevice, offsetMin: 70, content: 'Thought: 待根因报告确认后，关联设备 PM 记录与 alarm 日志做交叉验证。' },
        { role: 'user', type: 'chat', targetExpertId: eDevice, taskId: tDevice, offsetMin: 76, content: '设备专家，chamber PM 记录和 alarm 日志准备好了吗？' },
        { role: 'expert', type: 'chat', taskId: tDevice, expertId: eDevice, offsetMin: 82, content: '正在从设备管理系统导出近 3 个月 PM 记录，完成后立即做关联分析。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 95, content: '请今日下班前各提交阶段摘要，明早站会同步。' },
        { role: 'expert', type: 'chat', taskId: tRoot, expertId: eProcess, offsetMin: 100, content: '根因分析报告预计 17:00 前提交，含参数回标建议。' }
      ];
    }
    if (project.name.indexOf('供应链') >= 0) {
      var eSupply = findProjectMemberExpertId(pid, 'lead') ||
        (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === '需求预测建模'; }) || {}).expertId;
      var eDigital = (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === '数据治理规范'; }) || {}).expertId;
      var tForecast = findProjectTaskId(pid, '需求预测建模');
      var tGovern = findProjectTaskId(pid, '数据治理规范');
      return [
        { role: 'system', type: 'chat', offsetMin: 0, content: '项目「供应链数字化规划」已创建，各位专家请协同推进。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 4, content: '请供应链专家主导需求预测建模，数字化顾问配合主数据治理。' },
        { role: 'expert', type: 'thought', taskId: tForecast, expertId: eSupply, offsetMin: 10, content: 'Thought: 需整合近 12 个月订单、渠道反馈与促销日历，Top20 SKU 单独建模。' },
        { role: 'expert', type: 'chat', taskId: tForecast, expertId: eSupply, offsetMin: 16, content: '已加载近 12 个月订单数据，开始特征工程与季节性分解。' },
        { role: 'expert', type: 'chat', taskId: tGovern, expertId: eDigital, offsetMin: 22, content: '主数据治理规范草案已完成 60%，编码规则章节待与 ERP 团队对齐。' },
        { role: 'user', type: 'chat', targetExpertId: eSupply, taskId: tForecast, offsetMin: 32, content: 'Q3 Top20 SKU 预测校准结果什么时候能出？' },
        { role: 'expert', type: 'chat', taskId: tForecast, expertId: eSupply, offsetMin: 38, content: '今天下午可出初版，已纳入 6 月促销增量与海外订单反馈。' },
        { role: 'expert', type: 'action', taskId: tForecast, expertId: eSupply, toolName: '需求预测引擎', offsetMin: 45, content: '正在调用 [需求预测引擎] 训练多 SKU 预测模型…' },
        { role: 'expert', type: 'chat', taskId: tGovern, expertId: eDigital, offsetMin: 55, content: 'WMS 库位热力图已导出，可供预测模型的区域分仓特征使用。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 68, content: '周五下午安排阶段评审会，请准备汇报材料。' },
        { role: 'expert', type: 'chat', taskId: tForecast, expertId: eSupply, offsetMin: 74, content: '收到，同步准备 Q3 预测校准摘要和偏差分析。' },
        { role: 'expert', type: 'thought', taskId: tGovern, expertId: eDigital, offsetMin: 80, content: 'Thought: 评审前需完成物料编码一对多映射清单，供 IT 确认清洗范围。' },
        { role: 'expert', type: 'chat', taskId: tGovern, expertId: eDigital, offsetMin: 88, content: '规范草案周五前可提评审版，编码映射附录一并附上。' }
      ];
    }
    return [];
  }

  function buildProjectDemoMessages(project, baseIso) {
    return getDemoProjectMessageDefs(project).map(function (def) {
      return {
        id: uid(),
        role: def.role,
        type: def.type || 'chat',
        taskId: def.taskId || null,
        expertId: def.expertId || null,
        targetExpertId: def.targetExpertId || null,
        toolName: def.toolName || null,
        scope: def.scope || null,
        content: def.content,
        createdAt: addMinutesIso(baseIso, def.offsetMin || 0)
      };
    });
  }

  function ensureProjectDemoMessages(projectId) {
    var project = state.projects.find(function (p) { return p.id === projectId; });
    if (!project || !getDemoProjectMessageDefs(project).length) return false;
    var expected = getDemoProjectMessageDefs(project).length;
    var current = state.projectMessages[projectId] || [];
    if (current.length >= expected) return false;
    var baseIso = daysAgoIso(project.name.indexOf('供应链') >= 0 ? 1 : 2, 9, 0);
    state.projectMessages[projectId] = buildProjectDemoMessages(project, baseIso);
    return true;
  }

  function migrateProjectDemoMessages() {
    var updated = false;
    state.projects.forEach(function (p) {
      if (ensureProjectDemoMessages(p.id)) updated = true;
    });
    if (updated) persist();
  }

  window.AppStore = {
    uid: uid,
    nowIso: nowIso,
    init: function () {
      seedIfEmpty();
      migrateExpertRoleNames();
      migrateProjectsVisibility();
      migrateProjectTasks();
      migrateProjectTaskTitles();
      migrateProjectFiles();
      migrateProjectMessageTypes();
      migrateProjectDemoMessages();
      migrateExpertDialogueTasks();
      migrateExpertDialogueMessages();
      return state;
    },
    reset: function () {
      state = defaultState();
      persist();
      seedIfEmpty();
    },
    getState: function () { return state; },

    getExperts: function () {
      return state.experts.slice().sort(function (a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    },
    getExpert: function (id) {
      return state.experts.find(function (e) { return e.id === String(id); }) || null;
    },
    saveExpert: function (expert) {
      var idx = state.experts.findIndex(function (e) { return e.id === expert.id; });
      expert.updatedAt = nowIso();
      if (idx >= 0) state.experts[idx] = expert;
      else state.experts.unshift(expert);
      persist();
      return expert;
    },
    createExpert: function (payload) {
      var expert = {
        id: uid(),
        name: payload.name,
        avatar: payload.avatar || DEFAULT_EXPERT_AVATAR,
        description: payload.description,
        expertise: payload.expertise || [],
        category: payload.category || '工艺制造',
        visibility: payload.visibility || 'internal',
        status: 'active',
        updatedAt: nowIso()
      };
      state.experts.unshift(expert);
      state.personas[expert.id] = payload.persona || { coreDutyMd: '', workflowMd: '', behaviorMd: '' };
      state.skillBindings[expert.id] = payload.skillIds || [];
      state.toolBindings[expert.id] = payload.toolIds || [];
      persist();
      return expert;
    },
    deleteExpert: function (id) {
      state.experts = state.experts.filter(function (e) { return e.id !== id; });
      delete state.personas[id];
      delete state.skillBindings[id];
      delete state.toolBindings[id];
      state.favorites = state.favorites.filter(function (f) { return f !== id; });
      persist();
    },

    isFavorite: function (expertId) {
      return state.favorites.indexOf(expertId) >= 0;
    },
    toggleFavorite: function (expertId) {
      var i = state.favorites.indexOf(expertId);
      if (i >= 0) state.favorites.splice(i, 1);
      else state.favorites.push(expertId);
      persist();
    },

    getPersona: function (expertId) {
      return state.personas[expertId] || { coreDutyMd: '', workflowMd: '', behaviorMd: '' };
    },
    savePersona: function (expertId, persona) {
      state.personas[expertId] = persona;
      persist();
    },

    getSkillIds: function (expertId) {
      return state.skillBindings[expertId] || [];
    },
    setSkillIds: function (expertId, ids) {
      state.skillBindings[expertId] = ids;
      persist();
    },
    getToolIds: function (expertId) {
      return state.toolBindings[expertId] || [];
    },
    setToolIds: function (expertId, ids) {
      state.toolBindings[expertId] = ids;
      persist();
    },

    getMemories: function (expertId) {
      return state.memories.filter(function (m) { return m.expertId === expertId; });
    },
    addMemory: function (expertId, content) {
      var m = { id: uid(), expertId: expertId, content: content, scope: 'user', source: 'manual', createdAt: nowIso() };
      state.memories.unshift(m);
      persist();
      return m;
    },
    deleteMemory: function (memoryId) {
      state.memories = state.memories.filter(function (m) { return m.id !== memoryId; });
      persist();
    },

    getTasksByExpert: function (expertId, type, includeArchived) {
      return state.tasks.filter(function (t) {
        if (t.expertId !== expertId) return false;
        if (type && t.type !== type) return false;
        if (!includeArchived && t.archived) return false;
        return true;
      }).sort(function (a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    },
    getTask: function (taskId) {
      return state.tasks.find(function (t) { return t.id === taskId; }) || null;
    },
    createTask: function (payload) {
      var task = {
        id: uid(),
        title: payload.title || '新任务',
        type: payload.type || 'dialogue',
        status: 'pending',
        expertId: payload.expertId,
        projectId: payload.projectId || null,
        ownerId: 'admin',
        archived: false,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.tasks.unshift(task);
      state.messages[task.id] = [];
      persist();
      return task;
    },
    updateTask: function (taskId, patch) {
      var t = state.tasks.find(function (x) { return x.id === taskId; });
      if (!t) return null;
      Object.assign(t, patch, { updatedAt: nowIso() });
      persist();
      return t;
    },
    deleteTask: function (taskId) {
      state.tasks = state.tasks.filter(function (t) { return t.id !== taskId; });
      delete state.messages[taskId];
      if (state.taskArtifacts) {
        state.taskArtifacts = state.taskArtifacts.filter(function (a) { return a.taskId !== taskId; });
      }
      persist();
    },
    archiveTask: function (taskId, archived) {
      var t = state.tasks.find(function (x) { return x.id === taskId; });
      if (!t) return null;
      t.archived = !!archived;
      if (t.archived) t.archivedAt = nowIso();
      else delete t.archivedAt;
      t.updatedAt = nowIso();
      persist();
      return t;
    },

    getMessages: function (taskId) {
      return state.messages[taskId] || [];
    },
    addMessage: function (taskId, msg) {
      if (!state.messages[taskId]) state.messages[taskId] = [];
      var message = {
        id: uid(),
        role: msg.role,
        type: msg.type || 'chat',
        content: msg.content,
        expertId: msg.expertId || null,
        toolName: msg.toolName || null,
        skillName: msg.skillName || null,
        attachments: msg.attachments || null,
        createdAt: nowIso()
      };
      state.messages[taskId].push(message);
      var task = state.tasks.find(function (t) { return t.id === taskId; });
      if (task) task.updatedAt = nowIso();
      if (task && msg.role === 'user' && !task.titleSet) {
        task.title = msg.content.slice(0, 30) + (msg.content.length > 30 ? '…' : '');
        task.titleSet = true;
      }
      persist();
      return message;
    },

    getProjects: function (visibility) {
      return state.projects.filter(function (p) {
        if (!visibility || visibility === 'all') return true;
        return p.visibility === visibility;
      }).sort(function (a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    },
    getProject: function (id) {
      return state.projects.find(function (p) { return p.id === id; }) || null;
    },
    createProject: function (payload) {
      var project = {
        id: uid(),
        name: payload.name,
        icon: payload.icon || '📁',
        description: payload.description,
        visibility: payload.visibility || 'public',
        status: 'active',
        updatedAt: nowIso()
      };
      state.projects.unshift(project);
      state.projectMessages[project.id] = [
        { id: uid(), role: 'system', content: '项目「' + project.name + '」已创建。', createdAt: nowIso() }
      ];
      (payload.expertIds || []).forEach(function (eid) {
        AppStore.addProjectMember(project.id, eid);
      });
      persist();
      return project;
    },
    saveProject: function (project) {
      var idx = state.projects.findIndex(function (p) { return p.id === project.id; });
      project.updatedAt = nowIso();
      if (idx >= 0) state.projects[idx] = project;
      persist();
      return project;
    },
    deleteProject: function (id) {
      var removedTaskIds = state.tasks.filter(function (t) { return t.projectId === id; }).map(function (t) { return t.id; });
      state.projects = state.projects.filter(function (p) { return p.id !== id; });
      state.projectMembers = state.projectMembers.filter(function (m) { return m.projectId !== id; });
      delete state.projectMessages[id];
      state.projectOutputs = state.projectOutputs.filter(function (o) { return o.projectId !== id; });
      state.projectTasks = state.projectTasks.filter(function (t) { return t.projectId !== id; });
      state.projectFiles = state.projectFiles.filter(function (f) { return f.projectId !== id; });
      state.tasks = state.tasks.filter(function (t) { return t.projectId !== id; });
      removedTaskIds.forEach(function (tid) { delete state.messages[tid]; });
      persist();
    },

    getProjectMembers: function (projectId) {
      return state.projectMembers.filter(function (m) { return m.projectId === projectId; });
    },
    addProjectMember: function (projectId, expertId) {
      if (state.projectMembers.some(function (m) { return m.projectId === projectId && m.expertId === expertId; })) return;
      state.projectMembers.push({
        id: uid(),
        projectId: projectId,
        expertId: expertId,
        role: 'member',
        progress: 0,
        progressSummary: '待分配任务',
        joinedAt: nowIso()
      });
      persist();
    },
    removeProjectMember: function (memberId) {
      state.projectMembers = state.projectMembers.filter(function (m) { return m.id !== memberId; });
      persist();
    },
    updateMemberProgress: function (memberId, progress, summary) {
      var m = state.projectMembers.find(function (x) { return x.id === memberId; });
      if (!m) return;
      m.progress = progress;
      if (summary !== undefined) m.progressSummary = summary;
      persist();
    },

    getProjectsByExpert: function (expertId, visibility) {
      var pids = state.projectMembers.filter(function (m) { return m.expertId === expertId; }).map(function (m) { return m.projectId; });
      return state.projects.filter(function (p) {
        if (pids.indexOf(p.id) < 0) return false;
        if (visibility && p.visibility !== visibility) return false;
        return true;
      });
    },

    getProjectMessages: function (projectId) {
      return state.projectMessages[projectId] || [];
    },
    addProjectMessage: function (projectId, msg) {
      if (!state.projectMessages[projectId]) state.projectMessages[projectId] = [];
      var message = {
        id: uid(),
        role: msg.role,
        type: msg.type || 'chat',
        taskId: msg.taskId || null,
        toolName: msg.toolName || null,
        targetExpertId: msg.targetExpertId || null,
        scope: msg.scope || null,
        content: msg.content,
        expertId: msg.expertId || null,
        attachments: msg.attachments || null,
        createdAt: nowIso()
      };
      state.projectMessages[projectId].push(message);
      var p = state.projects.find(function (x) { return x.id === projectId; });
      if (p) p.updatedAt = nowIso();
      persist();
      return message;
    },

    getProjectOutputs: function (projectId) {
      return state.projectOutputs.filter(function (o) { return o.projectId === projectId; });
    },
    getProjectTasks: function (projectId) {
      return (state.projectTasks || [])
        .filter(function (t) { return t.projectId === projectId; })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
        .map(function (t) {
          var expert = t.expertId ? AppStore.getExpert(t.expertId) : null;
          return Object.assign({}, t, {
            expert: expert,
            assigneeLabel: expert ? expert.name : '待分配'
          });
        });
    },
    getProjectFiles: function (projectId) {
      return (state.projectFiles || [])
        .filter(function (f) { return f.projectId === projectId; })
        .sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    },
    addProjectOutput: function (payload) {
      var o = {
        id: uid(),
        projectId: payload.projectId,
        expertId: payload.expertId || null,
        title: payload.title,
        content: payload.content,
        createdAt: nowIso()
      };
      state.projectOutputs.unshift(o);
      persist();
      return o;
    },
    addProjectFile: function (payload) {
      var f = {
        id: uid(),
        projectId: payload.projectId,
        name: payload.name,
        type: payload.type || 'document',
        status: payload.status || 'ready',
        content: payload.content || '',
        expertId: payload.expertId || null,
        updatedAt: nowIso()
      };
      if (!state.projectFiles) state.projectFiles = [];
      state.projectFiles.unshift(f);
      var p = state.projects.find(function (x) { return x.id === payload.projectId; });
      if (p) p.updatedAt = nowIso();
      persist();
      return f;
    },

    getImChannels: function (expertId) {
      return state.imChannels[expertId] || [];
    },
    saveImChannels: function (expertId, channels) {
      state.imChannels[expertId] = channels;
      persist();
    },

    getPermissions: function (expertId) {
      if (!state.permissions[expertId]) {
        state.permissions[expertId] = [
          { id: uid(), subjectType: 'role', subjectId: 'admin', permission: 'admin', label: '管理员' },
          { id: uid(), subjectType: 'role', subjectId: 'user', permission: 'use', label: '普通用户（可使用）' }
        ];
        persist();
      }
      return state.permissions[expertId];
    },
    savePermissions: function (expertId, list) {
      state.permissions[expertId] = list;
      persist();
    },

    getWorkspaceFiles: function (expertId) {
      return (state.workspaceFiles[expertId] || []).slice().sort(function (a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    },
    addWorkspaceFile: function (expertId, name) {
      if (!state.workspaceFiles[expertId]) state.workspaceFiles[expertId] = [];
      var f = { id: uid(), name: name, kind: 'material', createdAt: nowIso() };
      state.workspaceFiles[expertId].push(f);
      persist();
      return f;
    },

    getExpertArtifacts: function (expertId) {
      if (!state.taskArtifacts) return [];
      var taskMap = {};
      state.tasks.filter(function (t) { return t.expertId === expertId; }).forEach(function (t) {
        taskMap[t.id] = t.title || '未命名任务';
      });
      return state.taskArtifacts
        .filter(function (a) { return taskMap[a.taskId]; })
        .map(function (a) {
          return Object.assign({}, a, { taskTitle: taskMap[a.taskId] });
        })
        .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    },

    getTaskArtifacts: function (taskId) {
      if (!taskId) return [];
      return state.taskArtifacts
        .filter(function (a) { return a.taskId === taskId; })
        .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    },
    addTaskArtifact: function (taskId, payload) {
      var a = {
        id: uid(),
        taskId: taskId,
        title: payload.title,
        content: payload.content || '',
        type: payload.type || 'document',
        createdAt: nowIso()
      };
      if (!state.taskArtifacts) state.taskArtifacts = [];
      state.taskArtifacts.unshift(a);
      persist();
      return a;
    },

    mockExpertWorkflowSteps: function (expert, taskId, userText) {
      var cap = getExpertDemoCapabilities(expert.id);
      var snippet = (userText || '').slice(0, 40) + ((userText || '').length > 40 ? '…' : '');
      this.addMessage(taskId, {
        role: 'expert', type: 'thought', expertId: expert.id,
        content: 'Thought: 理解用户需求后，先确认关键假设与所需数据来源。'
      });
      this.addMessage(taskId, {
        role: 'expert', type: 'skill', expertId: expert.id, skillName: cap.skill,
        content: '正在运用 [' + cap.skill + '] 技能分析：「' + (snippet || '当前任务') + '」'
      });
      this.addMessage(taskId, {
        role: 'expert', type: 'action', expertId: expert.id, toolName: cap.tool,
        content: '正在调用 [' + cap.tool + '] 获取相关数据…'
      });
    },

    mockExpertReply: function (expert, userText) {
      var snippets = [
        '基于您描述的情况，我建议先从数据验证入手。',
        '我已结合「' + (expert.expertise[0] || '专业') + '」经验梳理思路，请确认以下假设是否成立。',
        '初步方案已整理，如需我可调用绑定工具进一步分析。',
        '收到。我会整理相关资料，完成后同步给您。'
      ];
      var base = snippets[Math.floor(Math.random() * snippets.length)];
      return base + '\n\n（模拟回复 · 对接引擎后将替换为真实推理结果）\n\n针对：「' + userText.slice(0, 50) + (userText.length > 50 ? '…' : '') + '」';
    },

    mockTaskArtifact: function (expert, taskId, userText) {
      var types = [
        { type: 'report', label: '分析报告' },
        { type: 'document', label: '工作文档' },
        { type: 'data', label: '数据结果' }
      ];
      var pick = types[Math.floor(Math.random() * types.length)];
      var title = pick.label + ' · ' + (userText.slice(0, 12) || '任务产出') + (userText.length > 12 ? '…' : '');
      var content = '由「' + expert.name + '」基于当前对话生成。\n\n要点：' + userText.slice(0, 80) + (userText.length > 80 ? '…' : '') + '\n\n（模拟产物 · 对接引擎后替换为真实输出）';
      return this.addTaskArtifact(taskId, { title: title, content: content, type: pick.type });
    }
  };

  window.AppStore.init();
})();
