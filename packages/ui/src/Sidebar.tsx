/**
 * Sidebar Component
 * Notion-style collapsible sidebar with tree structure
 * AC-002: Sidebar Functionality
 */
import React from 'react';
import { TreeNode } from './useSidebar';
import { SidebarItem } from './SidebarItem';

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
        icon={typeof node.icon === 'string' ? <span style={{ opacity: 0.6, fontSize: '14px' }}>{node.icon}</span> : node.icon}
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

  // Drawer variant for mobile
  if (isDrawer) {
    return (
      <>
        {/* Drawer overlay */}
        {isDrawerOpen && (
          <div
            className="sidebar-drawer-overlay"
            onClick={onCloseDrawer}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 100,
              opacity: isDrawerOpen ? 1 : 0,
              transition: `opacity ${transitionDuration}ms ${transitionTiming}`,
            }}
          />
        )}

        {/* Drawer sidebar */}
        <aside
          className="sidebar-drawer"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: 240,
            backgroundColor: 'var(--color-bg-secondary)',
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: `transform ${transitionDuration}ms ${transitionTiming}`,
            zIndex: 101,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          <SidebarContent
            treeStructure={treeStructure}
            renderTree={renderTree}
            onToggle={onToggle}
            onItemClick={onItemClick}
            selectedId={selectedId}
            isExpanded={true}
          />
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <>
      {/* Main sidebar */}
      <aside
        className="sidebar"
        style={{
          width: isExpanded ? 240 : 0,
          minWidth: isExpanded ? 240 : 0,
          backgroundColor: 'var(--color-bg-secondary)',
          transition: `width ${transitionDuration}ms ${transitionTiming}, min-width ${transitionDuration}ms ${transitionTiming}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRight: isExpanded ? '1px solid var(--color-border)' : 'none',
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        <SidebarContent
          treeStructure={treeStructure}
          renderTree={renderTree}
          onToggle={onToggle}
          onItemClick={onItemClick}
          selectedId={selectedId}
          isExpanded={isExpanded}
        />
      </aside>

      {/* Floating sidebar when collapsed */}
      {!isExpanded && isFloatingVisible && (
        <aside
          className="sidebar-floating"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: 240,
            backgroundColor: 'var(--color-bg-secondary)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--color-border)',
          }}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        >
          <SidebarContent
            treeStructure={treeStructure}
            renderTree={renderTree}
            onToggle={onToggle}
            onItemClick={onItemClick}
            selectedId={selectedId}
            isExpanded={true}
          />
        </aside>
      )}

      {/* Toggle button */}
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        style={{
          position: 'fixed',
          left: isExpanded ? 228 : -12,
          top: 72,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 51,
          transition: `left ${transitionDuration}ms ${transitionTiming}, opacity 0.2s`,
          boxShadow: 'var(--shadow-sm)',
          opacity: isExpanded ? 1 : 0.4,
          fontSize: '10px',
          color: 'var(--color-text-tertiary)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => !isExpanded && (e.currentTarget.style.opacity = '0.4')}
        aria-label={isExpanded ? '收起侧边栏' : '展开侧边栏'}
      >
        {isExpanded ? '◀' : '▶'}
      </button>
    </>
  );
};

// Sidebar content component
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
  // Split treeStructure into "Views" and "Calendars"
  const viewItems = treeStructure.filter(node => node.id.startsWith('view-'));
  const otherItems = treeStructure.filter(node => !node.id.startsWith('view-'));

  return (
    <>
      {/* Header */}
      <div
        className="sidebar-header"
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          className="sidebar-logo"
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            backgroundColor: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-bg-primary)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          P
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Pie Calendar
        </span>
      </div>

      {/* Quick add button */}
      <div style={{ padding: '4px 12px 12px' }}>
        <button
          className="sidebar-quick-add"
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }}>+</span>
          <span>新建事项</span>
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {/* Views section */}
        {viewItems.length > 0 && (
          <div className="sidebar-section" style={{ marginBottom: 20 }}>
            <div
              className="sidebar-section-header"
              style={{
                padding: '8px 16px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              视图
            </div>
            <div className="sidebar-section-content">
              {renderTree(viewItems)}
            </div>
          </div>
        )}

        {/* Other section */}
        {otherItems.length > 0 && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-header"
              style={{
                padding: '8px 16px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              我的空间
            </div>
            <div className="sidebar-section-content">
              {renderTree(otherItems)}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div
        className="sidebar-footer"
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          className="sidebar-user-avatar"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: 'var(--color-bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
          }}
        >
          B
        </div>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Ben Jiang</span>
      </div>
    </>
  );
};
