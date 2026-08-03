'use client';

import { useState } from 'react';

const chapters = [
  ['起点', 'top'],
  ['全景', 'overview'],
  ['架构', 'architecture'],
  ['训练', 'training'],
  ['系统', 'infrastructure'],
  ['评测', 'evaluation'],
  ['结论', 'takeaways'],
];

const architecture = [
  {
    axis: '序列长度',
    title: 'Hybrid Attention',
    plain: '一边读，一边写摘要；每隔一段时间再翻阅完整档案。',
    detail: '每个 block 由 3 层 KDA 与 1 层 Gated MLA 组成，主干末尾再放一层 MLA。KDA 用固定大小的递归状态压缩历史，MLA 提供全局 token 交互。',
    stat: '69 KDA + 24 MLA',
  },
  {
    axis: '网络深度',
    title: 'Attention Residuals',
    plain: '后面的员工可以查阅早期部门的阶段成果，不只接收上一位的转述。',
    detail: 'AttnRes 对 embedding 和先前 block 输出进行注意力检索。K3 按 12 层划分 block，以较低内存代价保留跨层信息访问。',
    stat: '93 层 / 8 个主 block',
  },
  {
    axis: '模型宽度',
    title: 'Stable LatentMoE',
    plain: '公司有 896 个专业部门，每项任务只召集 16 个，再加 2 个常驻通用部门。',
    detail: '路由专家在 3584 维 latent space 工作，降低多专家激活的通信与权重读取成本；RMSNorm、SiTU-GLU 和 Quantile Balancing 负责稳定训练。',
    stat: '896 选 16',
  },
  {
    axis: '视觉输入',
    title: 'MoonViT-V2',
    plain: '图片和视频先被翻译成模型能读懂的视觉词语，再进入同一个大脑。',
    detail: '约 0.4B 参数、27 层，从零开始使用 next-token prediction 联合训练。2×2 pixel shuffle 将视觉 token 数减少四倍。',
    stat: '图像最高 3584²',
  },
];

const glossary = [
  ['参数', '模型训练后保留下来的大量数值。它们共同决定模型如何处理信息，不等同于可逐条读取的知识。'],
  ['Token', '模型处理文字的基本单位，可能是一个字、词的一部分或标点。100 万 token 是上下文容量，不是字数。'],
  ['MoE', 'Mixture-of-Experts，专家混合。只激活部分专家，在扩大总容量的同时控制单步计算量。'],
  ['Attention', '让当前 token 按相关程度读取其他 token 信息的机制。'],
  ['SFT', '监督微调。先用高质量示范告诉模型如何遵循指令、调用工具和组织回答。'],
  ['RL', '强化学习。模型尝试完成任务，依据可验证结果或奖励模型的评价继续改进。'],
  ['蒸馏', '让一个学生模型学习多个教师模型的行为，把分散能力合并起来。'],
  ['KV Cache', '保存历史注意力计算结果，避免生成每个新 token 时重复计算全部前文。'],
];

const benchmarks = [
  { group: '推理', name: 'GPQA Diamond', k3: 93.5, best: 94.1, leader: 'GPT-5.6 Sol', note: '研究生级科学问答' },
  { group: '推理', name: 'HLE + 工具', k3: 56.0, best: 63.0, leader: 'Claude Fable 5', note: '研究级综合难题' },
  { group: '编程', name: 'ProgramBench', k3: 77.8, best: 77.8, leader: 'Kimi K3', note: '程序开发任务' },
  { group: '编程', name: 'Terminal-Bench 2.1', k3: 88.3, best: 88.8, leader: 'GPT-5.6 Sol', note: '终端环境任务' },
  { group: 'Agent', name: 'BrowseComp', k3: 91.2, best: 91.2, leader: 'Kimi K3', note: '复杂网页搜索' },
  { group: 'Agent', name: 'MCPMark', k3: 94.5, best: 94.5, leader: 'Kimi K3', note: '真实工具使用' },
  { group: '视觉', name: 'OmniDocBench', k3: 91.1, best: 91.1, leader: 'Kimi K3', note: '复杂文档理解' },
  { group: '视觉', name: 'ZeroBench + Python', k3: 41.0, best: 46.0, leader: 'Claude Fable 5', note: '极难视觉推理' },
];

const infraItems = [
  ['长上下文计算', 'FlashKDA 与 KDA Context Parallelism', '把序列切到设备内外并行处理，再用可结合的状态变换精确合并。'],
  ['3T 训练', 'MoonEP 专家并行', '动态复制热点专家，让各卡收到完全相同数量的 token，并以静态计算形状减少同步和碎片。'],
  ['显存管理', '统一 activation manager', '按张量组合重计算、FP8 量化、本地或远程卸载，并把传输藏进计算过程。'],
  ['百万 token RL', '外部 KV cache + 自动节流', '把空闲前缀写回 CPU 内存，按运行时缓存压力动态控制请求并发。'],
  ['长期环境', 'AgentENV microVM', '沙箱可以暂停、恢复、分叉和快照；论文报告共创建 51,219,741 个沙箱。'],
  ['在线服务', '联合缓存与预算调度', 'KDA 状态和 MLA KV 统一管理，用 512-token 细粒度前缀命中与流量预算隔离长请求。'],
];

function Arrow() {
  return <span aria-hidden="true">↓</span>;
}

export default function K3Story() {
  const [activeExpert, setActiveExpert] = useState(16);
  const [attentionMode, setAttentionMode] = useState<'kda' | 'mla'>('kda');
  const [effort, setEffort] = useState<'low' | 'high' | 'max'>('high');
  const [benchGroup, setBenchGroup] = useState('全部');

  const visibleBenchmarks = benchmarks.filter((item) => benchGroup === '全部' || item.group === benchGroup);

  return (
    <main className="k3-page" id="top">
      <a className="skip-link" href="#overview">跳到正文</a>
      <nav className="k3-nav" aria-label="章节导航">
        <a className="k3-brand" href="#top" aria-label="回到顶部"><b>K3</b><span>论文导读</span></a>
        <div className="k3-nav-links">
          {chapters.slice(1).map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </div>
        <a className="nav-source" href="https://huggingface.co/moonshotai/Kimi-K3" target="_blank" rel="noreferrer">模型权重 ↗</a>
      </nav>

      <header className="k3-hero">
        <div className="hero-copy">
          <p className="hero-kicker">KIMI K3 · OPEN FRONTIER INTELLIGENCE</p>
          <h1>把一台<span>3 万亿参数</span>的机器，拆开看懂。</h1>
          <p className="hero-lede">不需要机器学习基础。从“专家公司”的比喻出发，读懂架构、训练、系统工程、成绩与局限。</p>
          <div className="hero-actions">
            <a className="primary-action" href="#overview">开始阅读</a>
            <span>预计 15 分钟 · 中文 · 初学者友好</span>
          </div>
        </div>
        <div className="hero-machine" aria-label="Kimi K3 核心规模图">
          <div className="machine-orbit orbit-one" />
          <div className="machine-orbit orbit-two" />
          <div className="machine-core">
            <small>总参数</small>
            <strong>2.8T</strong>
            <span>一次只唤醒一部分</span>
          </div>
          <div className="machine-tag tag-a"><b>104B</b> 激活参数</div>
          <div className="machine-tag tag-b"><b>1M</b> 上下文</div>
          <div className="machine-tag tag-c"><b>原生</b> 视觉</div>
          <div className="machine-tag tag-d"><b>开源</b> 权重</div>
        </div>
      </header>

      <section className="thesis-strip" aria-label="论文核心结论">
        <p>论文的核心不是“只把模型做大”。</p>
        <strong>它同时扩展了容量、记忆、信息流与行动时间。</strong>
      </section>

      <section className="k3-section overview-section" id="overview">
        <div className="section-heading">
          <span className="section-index">01</span>
          <h2>先看全景：四个方向一起扩展</h2>
          <p>K3 把模型看成一个信息系统。每项新技术，都在解决信息沿某个方向流动时的瓶颈。</p>
        </div>
        <div className="axis-map">
          <div className="axis-center"><b>KIMI K3</b><span>信息流</span></div>
          <div className="axis-item axis-sequence"><span>序列</span><b>1M tokens</b><small>KDA + MLA</small></div>
          <div className="axis-item axis-depth"><span>深度</span><b>93 层</b><small>AttnRes</small></div>
          <div className="axis-item axis-width"><span>宽度</span><b>896 专家</b><small>LatentMoE</small></div>
          <div className="axis-item axis-time"><span>时间</span><b>数千步</b><small>Agentic RL</small></div>
        </div>
        <div className="scale-ledger">
          <div><strong>2.78T</strong><span>全部参数</span><p>代表总容量与存储规模</p></div>
          <div><strong>104.2B</strong><span>每 token 激活</span><p>代表一步实际使用的参数</p></div>
          <div><strong>2.5×</strong><span>论文声称的 scaling efficiency</span><p>指同等验证损失所需训练算力，不是推理快 2.5 倍</p></div>
        </div>
      </section>

      <section className="k3-section" id="architecture">
        <div className="section-heading compact">
          <span className="section-index">02</span>
          <h2>模型架构：先用比喻理解，再看准确含义</h2>
        </div>
        <div className="architecture-list">
          {architecture.map((item) => (
            <article className="architecture-row" key={item.title}>
              <div className="architecture-axis">{item.axis}</div>
              <div className="architecture-title"><h3>{item.title}</h3><b>{item.stat}</b></div>
              <div><span className="plain-label">小白版</span><p>{item.plain}</p></div>
              <div><span className="exact-label">准确版</span><p>{item.detail}</p></div>
            </article>
          ))}
        </div>

        <div className="lab-grid">
          <article className="interactive-lab expert-lab">
            <div className="lab-copy">
              <span>互动 1</span>
              <h3>896 个专家，不会同时上班</h3>
              <p>拖动滑块观察路由专家的激活比例。K3 实际固定选择 16 个，这里用亮点示意“少量被选中”。</p>
              <label htmlFor="expert-range">当前激活：<b>{activeExpert}</b> / 896</label>
              <input id="expert-range" type="range" min="1" max="64" value={activeExpert} onChange={(event) => setActiveExpert(Number(event.target.value))} />
              <small>论文配置：16 个路由专家 + 2 个全宽共享专家</small>
            </div>
            <div className="expert-cloud" aria-label={`${activeExpert} 个示意专家被激活`}>
              {Array.from({ length: 112 }, (_, index) => {
                const visibleActive = Math.max(1, Math.round(activeExpert / 8));
                return <i key={index} className={index < visibleActive ? 'active' : ''} />;
              })}
              <div><strong>{(activeExpert / 896 * 100).toFixed(1)}%</strong><span>路由池激活比例</span></div>
            </div>
          </article>

          <article className="interactive-lab attention-lab">
            <div className="lab-copy">
              <span>互动 2</span>
              <h3>摘要记忆，还是完整翻阅？</h3>
              <div className="segmented" role="group" aria-label="选择注意力模式">
                <button className={attentionMode === 'kda' ? 'selected' : ''} onClick={() => setAttentionMode('kda')}>KDA 摘要</button>
                <button className={attentionMode === 'mla' ? 'selected' : ''} onClick={() => setAttentionMode('mla')}>MLA 全局</button>
              </div>
              <p>{attentionMode === 'kda' ? 'KDA 把历史持续压入固定大小状态。序列增长时，缓存不会随 token 数线性增长。' : 'MLA 仍能让当前 token 与整个上下文直接互动，但 KV cache 和计算随序列增长。'}</p>
              <small>K3 的答案不是二选一，而是 3 层 KDA 后接 1 层 MLA。</small>
            </div>
            <div className={`attention-viz ${attentionMode}`}>
              {attentionMode === 'kda' ? (
                <><div className="token-stream">{Array.from({ length: 15 }, (_, i) => <i key={i} />)}</div><Arrow /><div className="state-box"><b>S</b><span>固定状态</span></div><Arrow /><div className="output-token">输出</div></>
              ) : (
                <><div className="global-tokens">{Array.from({ length: 15 }, (_, i) => <i key={i} />)}</div><div className="global-lines" /><div className="output-token">全局读取</div></>
              )}
            </div>
          </article>
        </div>

        <article className="kda-explainer">
          <div>
            <h3>KDA 的公式，最少要懂什么？</h3>
            <p>不用推导，只抓住三个符号：状态 <b>S</b> 是笔记本，<b>α</b> 决定旧内容保留多少，<b>β</b> 决定新内容写入多强。</p>
          </div>
          <div className="formula-flow">
            <span>旧状态 S<sub>t-1</sub></span><b>× 保留门 α</b><strong>+</strong><span>新信息 k,v</span><b>× 写入门 β</b><strong>→</strong><span>新状态 S<sub>t</sub></span>
          </div>
          <p className="formula-note">论文把 log-decay 限制在有限范围，使 16-token tile 的数值保持在 BF16 可表示范围内，从而让对角和非对角 tile 都使用 Tensor Core 密集矩阵乘法。这是数值稳定性改动，也是硬件效率改动。</p>
        </article>
      </section>

      <section className="k3-section training-section" id="training">
        <div className="section-heading">
          <span className="section-index">03</span>
          <h2>训练：先学世界，再学会做事</h2>
          <p>训练不是一个阶段。K3 先建立通用能力，再用示范启动 Agent 行为，用强化学习形成专业策略，最后把九个策略合为一个模型。</p>
        </div>
        <div className="training-rail">
          <article><b>01</b><h3>原生多模态预训练</h3><p>网页、代码、数学、知识与视觉数据从一开始共同使用 next-token prediction。</p><span>8K → 64K</span></article>
          <Arrow />
          <article><b>02</b><h3>长上下文扩展</h3><p>清洗真实长文与视频，并合成必须跨远距离取证才能完成的任务。</p><span>256K → 1M</span></article>
          <Arrow />
          <article><b>03</b><h3>SFT 冷启动</h3><p>高质量轨迹教会模型自适应思考、准确调用工具与稳定执行。</p><span>XTML 模板</span></article>
          <Arrow />
          <article><b>04</b><h3>多领域 RL</h3><p>在通用、Agent 和编程三个领域，分别训练多种推理强度。</p><span>9 个教师</span></article>
          <Arrow />
          <article><b>05</b><h3>MOPD 合并</h3><p>学生在自己的轨迹上接受相应教师的逐 token 指导，最终统一能力。</p><span>1 个模型</span></article>
        </div>

        <div className="effort-stage">
          <div className="effort-copy">
            <h3>推理强度不是“想多久都行”</h3>
            <p>训练为每道题估计初始预算。超过当前倍率阈值的轨迹会得到惩罚，以减少无效长思考和 Agent 的冗长工具调用。</p>
            <div className="segmented" role="group" aria-label="推理强度">
              {(['low', 'high', 'max'] as const).map((level) => <button key={level} className={effort === level ? 'selected' : ''} onClick={() => setEffort(level)}>{level}</button>)}
            </div>
          </div>
          <div className={`effort-meter effort-${effort}`}>
            <div className="effort-track"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <strong>{effort === 'low' ? '快速完成' : effort === 'high' ? '平衡深度与成本' : '最大推理预算'}</strong>
            <span>{effort === 'low' ? '更少思考 token，适合简单任务' : effort === 'high' ? '为多数复杂任务保留充分步骤' : '用于最难问题，但仍设置上限防止过度思考'}</span>
          </div>
        </div>

        <div className="agent-loop">
          <div className="loop-center"><b>可验证结果</b><span>不是“自称完成”</span></div>
          {['理解目标', '制定计划', '调用工具', '观察环境', '验证结果', '修正策略'].map((label, index) => <div key={label} className={`loop-step loop-${index}`}>{label}</div>)}
        </div>
        <p className="center-note">训练环境覆盖搜索、专业知识工作、软件工程、GPU kernel、视觉推理、个人助理、Web 开发与自主执行任务。</p>
      </section>

      <section className="k3-section infra-section" id="infrastructure">
        <div className="section-heading compact">
          <span className="section-index">04</span>
          <h2>系统工程：模型能训练出来，也要能跑起来</h2>
        </div>
        <div className="infra-stack">
          {infraItems.map(([problem, solution, detail], index) => (
            <article key={problem}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><small>难题</small><h3>{problem}</h3></div>
              <div><small>方案</small><b>{solution}</b></div>
              <p>{detail}</p>
            </article>
          ))}
        </div>
        <div className="cache-story">
          <div className="cache-copy">
            <h3>为什么 1M 上下文最怕“缓存未命中”？</h3>
            <p>论文举例：一次编程请求可能携带 400K token 的旧前缀，却只新增 4K。命中缓存时只算新增内容；未命中则需要重新预填充约 400K。</p>
          </div>
          <div className="cache-bar" aria-label="400K 缓存前缀和 4K 新内容示意">
            <div className="cache-hit"><span>可复用前缀</span><b>400K</b></div>
            <div className="cache-new"><span>新增</span><b>4K</b></div>
          </div>
          <p>因此服务端按会话的缓存位置调度请求，并为短请求与超长请求分配不同资源预算，避免一批百万 token 请求拖慢全部用户。</p>
        </div>
      </section>

      <section className="k3-section evaluation-section" id="evaluation">
        <div className="section-heading">
          <span className="section-index">05</span>
          <h2>评测：它很强，但不是“全面第一”</h2>
          <p>选择领域查看代表性成绩。条形长度按 100 分归一展示；不同 benchmark 的分数不可横向比较。</p>
        </div>
        <div className="bench-tabs" role="group" aria-label="评测领域筛选">
          {['全部', '推理', '编程', 'Agent', '视觉'].map((group) => <button key={group} className={benchGroup === group ? 'selected' : ''} onClick={() => setBenchGroup(group)}>{group}</button>)}
        </div>
        <div className="benchmark-list">
          {visibleBenchmarks.map((item) => (
            <article key={item.name}>
              <div className="bench-name"><span>{item.group}</span><h3>{item.name}</h3><small>{item.note}</small></div>
              <div className="bench-bars">
                <div><label>Kimi K3 <b>{item.k3.toFixed(1)}</b></label><span><i style={{ width: `${item.k3}%` }} /></span></div>
                <div><label>{item.leader} <b>{item.best.toFixed(1)}</b></label><span><i style={{ width: `${item.best}%` }} /></span></div>
              </div>
              <div className={item.leader === 'Kimi K3' ? 'bench-rank win' : 'bench-rank'}>{item.leader === 'Kimi K3' ? '本组领先' : `差 ${Math.abs(item.best - item.k3).toFixed(1)}`}</div>
            </article>
          ))}
        </div>

        <div className="evidence-grid">
          <article className="strengths">
            <h3>报告显示的强项</h3>
            <ul><li>长程 Agent、搜索与工具调用</li><li>编程、终端任务与 GPU kernel 优化</li><li>文档视觉、多模态工具增强</li><li>相对闭源前沿模型的成本效率</li><li>完整模型权重开放</li></ul>
          </article>
          <article className="limits">
            <h3>仍需谨慎的地方</h3>
            <ul><li>HLE、CritPt 等研究级推理仍有差距</li><li>Agent 分数同时受 harness、工具和预算影响</li><li>大量主表结果来自开发团队自身评测</li><li>缺少覆盖全部新组件的完整独立消融</li><li>“支持 1M”不等于任意位置都能无损利用</li></ul>
          </article>
        </div>

        <aside className="cyber-note">
          <span>安全观察</span>
          <div><h3>网络安全能力已经具有现实意义</h3><p>报告称模型在漏洞发现上识别出多个此前未知漏洞；在 36 个端到端利用任务中完成 14 个，高于 GLM-5.2 的 8 个，但在强化内核目标上仍明显落后人类专家。作者将当前评测视为能力下界。</p></div>
        </aside>
      </section>

      <section className="k3-section takeaways-section" id="takeaways">
        <div className="takeaway-title">
          <span>读完整篇，记住这四句</span>
          <h2>K3 的突破来自协同，而不是某个魔法公式。</h2>
        </div>
        <ol className="takeaway-list">
          <li><b>大，但不全用。</b><span>2.8T 总参数通过 MoE 稀疏激活，每个 token 使用约 104B。</span></li>
          <li><b>长，但不全翻。</b><span>KDA 用固定状态处理长历史，周期性 MLA 恢复全局交互。</span></li>
          <li><b>会想，也会行动。</b><span>九个领域与强度专家通过 MOPD 合并成长程 Agent 能力。</span></li>
          <li><b>成绩要带条件读。</b><span>前沿且开放，但评测配置、成本、工具和证据强度必须一起看。</span></li>
        </ol>

        <details className="glossary">
          <summary>打开小白术语表 <span>8 个关键词</span></summary>
          <div>{glossary.map(([term, meaning]) => <article key={term}><h3>{term}</h3><p>{meaning}</p></article>)}</div>
        </details>
      </section>

      <footer className="k3-footer">
        <div><b>KIMI K3</b><span>交互式论文导读</span></div>
        <p>内容依据 Kimi K3 Technical Report 整理。所有模型能力与数字均应结合论文评测配置理解。</p>
        <a href="#top">返回顶部 ↑</a>
      </footer>
    </main>
  );
}
