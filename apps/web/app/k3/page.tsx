import type { Metadata } from 'next';
import K3Story from './K3Story';
import './k3.css';

export const metadata: Metadata = {
  title: '读懂 Kimi K3 | 交互式论文导读',
  description: '面向初学者的 Kimi K3 技术报告可视化导读：架构、训练、基础设施、评测与局限。',
};

export default function K3Page() {
  return <K3Story />;
}
