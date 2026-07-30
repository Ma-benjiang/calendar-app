/**
 * Sidebar Component
 * Premium Skeuomorphic Sidebar - Dark Wood/Charcoal Theme
 */
import React from 'react';
import { TreeNode } from './useSidebar';
import { SidebarItem } from './SidebarItem';
import './Sidebar.css';

interface SidebarProps {
  isExpanded: boolean;
  width: number;
  treeStructure: TreeNode[];
  selectedId: string | null;
  expandedFolders: string[];
  isFloatingVisible: boolean;
  isDrawerOpen: boolean;
  variant: 'sidebar' | 'drawer';
  transitionDuration: number;
  transitionTiming: string;
  onToggle: () => void;
  onItemClick: (id: string) => void;
  onFolderToggle: (id: string) => void;
  onHover: (isHovering: boolean) => void;
  onCloseDrawer: () => void;
  getItemStyle: (id: string) => React.CSSProperties;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isExpanded,
  width: _width,
  treeStructure,
  selectedId,
  expandedFolders,
  isFloatingVisible,
  isDrawerOpen,
  variant,
  transitionDuration,
  transitionTiming,
  onToggle,
  onItemClick,
  onFolderToggle,
  onHover,
  onCloseDrawer,
  getItemStyle,
}) => {
  const isDrawer = variant === 'drawer';

  // Render tree recursively
  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => (
      <SidebarItem
        key={node.id}
        id={node.id}
        name={node.name}
        type={node.type}
        level={level}
        isSelected={selectedId === node.id}
        isExpanded={expandedFolders.includes(node.id)}
        hasChildren={node.children.length > 0}
        // 统一处理图标样式：如果是字符串，包装成淡淡的小图标
        icon={typeof node.icon === 'string' ? 
          <span style={{ opacity: 0.5, fontSize: '14px' }}>{node.icon}</span> : 
          node.icon
        }
        color={node.color}
        style={getItemStyle(node.id)}
        onClick={() => onItemClick(node.id)}
        onToggle={() => onFolderToggle(node.id)}
      >
        {node.children.length > 0 &&
          expandedFolders.includes(node.id) &&
          renderTree(node.children, level + 1)}
      </SidebarItem>
    ));
  };

  const sidebarContent = (
    <SidebarContent
      treeStructure={treeStructure}
      renderTree={renderTree}
      onToggle={onToggle}
      onItemClick={onItemClick}
      selectedId={selectedId}
      isExpanded={true}
    />
  );

  if (isDrawer) {
    return (
      <>
        {isDrawerOpen && (
          <div
            className="sidebar-drawer-overlay"
            onClick={onCloseDrawer}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 100,
              opacity: isDrawerOpen ? 1 : 0,
              transition: `opacity ${transitionDuration}ms ${transitionTiming}`,
            }}
          />
        )}
        <aside
          className="sidebar drawer"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: 260,
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: `transform ${transitionDuration}ms ${transitionTiming}`,
            zIndex: 101,
          }}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <div 
      className={`sidebar-root ${!isExpanded ? 'collapsed' : ''}`}
      style={{
        position: 'relative',
        height: '100%',
        zIndex: 100,
        backgroundColor: '#2c2a26',
        transition: `width ${transitionDuration}ms ${transitionTiming}`,
        width: isExpanded ? 260 : 0,
      }}
    >
      <aside
        className="sidebar"
        style={{
          width: 260,
          height: '100%',
          position: 'absolute',
          left: isExpanded ? 0 : -260,
          transition: `left ${transitionDuration}ms ${transitionTiming}`,
          overflow: 'hidden',
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        {sidebarContent}
      </aside>
      
      {/* 物理 Toggle Tab */}
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={isExpanded ? '收起侧边栏' : '展开侧边栏'}
        style={{
          position: 'absolute',
          left: isExpanded ? 248 : 0,
          transition: `left ${transitionDuration}ms ${transitionTiming}`,
          zIndex: 1000,
        }}
      >
        {isExpanded ? '◀' : '▶'}
      </button>

      {/* Floating sidebar when collapsed */}
      {!isExpanded && isFloatingVisible && (
        <aside
          className="sidebar floating"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: 260,
            zIndex: 50,
            boxShadow: '8px 0 24px rgba(0,0,0,0.3)',
            backgroundColor: '#2c2a26',
          }}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        >
          {sidebarContent}
        </aside>
      )}
    </div>
  );
};

interface SidebarContentProps {
  treeStructure: TreeNode[];
  renderTree: (nodes: TreeNode[], level?: number) => React.ReactNode;
  onToggle: () => void;
  onItemClick: (id: string) => void;
  selectedId: string | null;
  isExpanded: boolean;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  treeStructure,
  renderTree,
}) => {
  return (
    <div className="sidebar-inner" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: 260 }}>
      {/* Header */}
      <div className="sidebar-header">
        <img src="./logo.png" alt="Pie Calendar" className="sidebar-logo" />
        <span className="sidebar-app-name">Pie Calendar</span>
      </div>

      {/* Navigation - Purely data driven now */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
        <div className="sidebar-section">
          <div className="sidebar-section-header">Navigation</div>
          <div className="sidebar-section-content">
            {renderTree(treeStructure)}
          </div>
        </div>
      </nav>
    </div>
  );
};
