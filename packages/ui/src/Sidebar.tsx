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
        icon={node.icon}
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
            backgroundColor: '#f7f6f3',
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: `transform ${transitionDuration}ms ${transitionTiming}`,
            zIndex: 101,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SidebarContent
            treeStructure={treeStructure}
            renderTree={renderTree}
            onToggle={onToggle}
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
          backgroundColor: '#f7f6f3',
          transition: `width ${transitionDuration}ms ${transitionTiming}, min-width ${transitionDuration}ms ${transitionTiming}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        <SidebarContent
          treeStructure={treeStructure}
          renderTree={renderTree}
          onToggle={onToggle}
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
            backgroundColor: '#f7f6f3',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
          }}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        >
          <SidebarContent
            treeStructure={treeStructure}
            renderTree={renderTree}
            onToggle={onToggle}
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
          left: isExpanded ? 240 : 0,
          top: 16,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1px solid #e3e2e0',
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 51,
          transition: `left ${transitionDuration}ms ${transitionTiming}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
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
  isExpanded: boolean;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  treeStructure,
  renderTree,
}) => {
  return (
    <>
      {/* Header */}
      <div
        className="sidebar-header"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e3e2e0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          className="sidebar-logo"
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: '#37352f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          P
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#37352f',
          }}
        >
          Pie Calendar
        </span>
      </div>

      {/* Quick add button */}
      <div style={{ padding: '8px 16px' }}>
        <button
          className="sidebar-quick-add"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #e3e2e0',
            backgroundColor: '#fff',
            color: '#37352f',
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'background-color 0.2s',
          }}
        >
          <span>+</span>
          <span>新建</span>
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {/* Views section */}
        <div className="sidebar-section" style={{ marginBottom: 16 }}>
          <div
            className="sidebar-section-header"
            style={{
              padding: '4px 16px',
              fontSize: 12,
              color: '#9a9a9a',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            视图
          </div>
          <div className="sidebar-section-content">
            <SidebarItem
              id="view-today"
              name="今天"
              type="view"
              level={0}
              isSelected={false}
              isExpanded={false}
              hasChildren={false}
              icon="📅"
            />
            <SidebarItem
              id="view-schedule"
              name="日程"
              type="view"
              level={0}
              isSelected={false}
              isExpanded={false}
              hasChildren={false}
              icon="📋"
            />
            <SidebarItem
              id="view-week"
              name="周视图"
              type="view"
              level={0}
              isSelected={false}
              isExpanded={false}
              hasChildren={false}
              icon="📆"
            />
            <SidebarItem
              id="view-month"
              name="月视图"
              type="view"
              level={0}
              isSelected={false}
              isExpanded={false}
              hasChildren={false}
              icon="🗓"
            />
          </div>
        </div>

        {/* Calendars section */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-header"
            style={{
              padding: '4px 16px',
              fontSize: 12,
              color: '#9a9a9a',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            日历
          </div>
          <div className="sidebar-section-content">
            {renderTree(treeStructure)}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div
        className="sidebar-footer"
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e3e2e0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          className="sidebar-user-avatar"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: '#e3e2e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
        >
          U
        </div>
        <span style={{ fontSize: 14, color: '#6b6b6b' }}>用户</span>
      </div>
    </>
  );
};
