/**
 * Sidebar Hook
 * Manages sidebar state, tree structure, and interactions
 * AC-002: Sidebar Functionality Acceptance Criteria
 */
import { useState, useCallback, useMemo, useEffect } from 'react';

export interface SidebarItem {
  id: string;
  name: string;
  type: 'calendar' | 'folder' | 'view' | 'tag';
  parentId: string | null;
  icon?: string;
  color?: string;
}

export interface TreeNode extends SidebarItem {
  children: TreeNode[];
  level: number;
}

interface UseSidebarOptions {
  items: SidebarItem[];
  isMobile?: boolean;
  onReorder?: (items: SidebarItem[]) => void;
  onItemClick?: (id: string) => void;
}

interface UseSidebarReturn {
  // State
  isExpanded: boolean;
  width: number;
  selectedId: string | null;
  expandedFolders: string[];
  isFloatingVisible: boolean;
  isDrawerOpen: boolean;
  variant: 'sidebar' | 'drawer';
  drawerPosition: 'left' | 'right';
  transitionDuration: number;
  transitionTiming: string;

  // Tree structure
  treeStructure: TreeNode[];

  // Actions
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  selectItem: (id: string) => void;
  expandFolder: (id: string) => void;
  collapseFolder: (id: string) => void;
  toggleFolder: (id: string) => void;
  isFolderExpanded: (id: string) => boolean;
  handleHover: (isHovering: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  handleItemClick: (id: string) => void;
  handleDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;

  // Helpers
  getIndentLevel: (id: string) => number;
  getItemStyle: (id: string) => React.CSSProperties;
}

const STORAGE_KEY_ORDER = 'sidebar-order';
const STORAGE_KEY_EXPANDED = 'sidebar-expanded';
const STORAGE_KEY_SELECTED = 'sidebar-selected';
const STORAGE_KEY_SIDEBAR_STATE = 'sidebar-state';

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 0;
const TRANSITION_DURATION = 200;
const TRANSITION_TIMING = 'ease-out';

export function useSidebar(options: UseSidebarOptions): UseSidebarReturn {
  const { items, isMobile = false, onReorder, onItemClick } = options;

  // Core state
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR_STATE);
    return saved ? JSON.parse(saved) : true;
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_SELECTED);
  });
  const [expandedFolders, setExpandedFolders] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY_EXPANDED);
    return saved ? JSON.parse(saved) : [];
  });
  const [isFloatingVisible, setIsFloatingVisible] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [orderedItems, setOrderedItems] = useState<SidebarItem[]>(() => {
    if (typeof window === 'undefined') return items;
    const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
    if (savedOrder) {
      const orderIds: string[] = JSON.parse(savedOrder);
      // Reorder items based on saved order
      const itemMap = new Map(items.map(item => [item.id, item]));
      const ordered = orderIds
        .map(id => itemMap.get(id))
        .filter((item): item is SidebarItem => item !== undefined);
      // Add any new items not in saved order
      const orderedIds = new Set(orderIds);
      const newItems = items.filter(item => !orderedIds.has(item.id));
      return [...ordered, ...newItems];
    }
    return items;
  });

  // Update ordered items when items prop changes
  useEffect(() => {
    setOrderedItems(prev => {
      const prevMap = new Map(prev.map(item => [item.id, item]));
      // Keep existing order for items that still exist
      const existing = prev.filter(item => items.some(i => i.id === item.id));
      // Add new items
      const newItems = items.filter(item => !prevMap.has(item.id));
      return [...existing, ...newItems];
    });
  }, [items]);

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_SIDEBAR_STATE, JSON.stringify(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify(expandedFolders));
  }, [expandedFolders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedId) {
      localStorage.setItem(STORAGE_KEY_SELECTED, selectedId);
    }
  }, [selectedId]);

  // Build tree structure
  const treeStructure = useMemo(() => {
    const itemMap = new Map<string, TreeNode>();

    // First pass: create nodes
    orderedItems.forEach(item => {
      itemMap.set(item.id, { ...item, children: [], level: 0 });
    });

    // Second pass: build tree
    const rootNodes: TreeNode[] = [];
    orderedItems.forEach(item => {
      const node = itemMap.get(item.id)!;
      if (item.parentId === null) {
        node.level = 0;
        rootNodes.push(node);
      } else {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          node.level = parent.level + 1;
          parent.children.push(node);
        } else {
          // Parent not found, treat as root
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }, [orderedItems]);

  // Flatten tree for navigation
  const flattenedItems = useMemo(() => {
    const result: SidebarItem[] = [];
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        result.push(node);
        if (expandedFolders.includes(node.id)) {
          traverse(node.children);
        }
      });
    };
    traverse(treeStructure);
    return result;
  }, [treeStructure, expandedFolders]);

  // Actions
  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const selectItem = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const expandFolder = useCallback((id: string) => {
    setExpandedFolders(prev =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }, []);

  const collapseFolder = useCallback((id: string) => {
    setExpandedFolders(prev => prev.filter(folderId => folderId !== id));
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders(prev =>
      prev.includes(id)
        ? prev.filter(folderId => folderId !== id)
        : [...prev, id]
    );
  }, []);

  const isFolderExpanded = useCallback((id: string) => {
    return expandedFolders.includes(id);
  }, [expandedFolders]);

  const handleHover = useCallback((isHovering: boolean) => {
    setIsFloatingVisible(isHovering);
  }, []);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleItemClick = useCallback((id: string) => {
    setSelectedId(id);
    onItemClick?.(id);
  }, [onItemClick]);

  const handleDragEnd = useCallback((event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex(item => item.id === active.id);
    const newIndex = orderedItems.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = [...orderedItems];
    const [movedItem] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movedItem);

    setOrderedItems(newItems);
    localStorage.setItem(
      STORAGE_KEY_ORDER,
      JSON.stringify(newItems.map(item => item.id))
    );
    onReorder?.(newItems);
  }, [orderedItems, onReorder]);

  const navigateNext = useCallback(() => {
    if (!selectedId) {
      if (flattenedItems.length > 0) {
        setSelectedId(flattenedItems[0].id);
      }
      return;
    }
    const currentIndex = flattenedItems.findIndex(item => item.id === selectedId);
    if (currentIndex < flattenedItems.length - 1) {
      setSelectedId(flattenedItems[currentIndex + 1].id);
    }
  }, [selectedId, flattenedItems]);

  const navigatePrevious = useCallback(() => {
    if (!selectedId) return;
    const currentIndex = flattenedItems.findIndex(item => item.id === selectedId);
    if (currentIndex > 0) {
      setSelectedId(flattenedItems[currentIndex - 1].id);
    }
  }, [selectedId, flattenedItems]);

  // Helpers
  const getIndentLevel = useCallback((id: string) => {
    const findLevel = (nodes: TreeNode[], targetId: string, currentLevel: number): number => {
      for (const node of nodes) {
        if (node.id === targetId) return currentLevel;
        const found = findLevel(node.children, targetId, currentLevel + 1);
        if (found !== -1) return found;
      }
      return -1;
    };
    return findLevel(treeStructure, id, 0);
  }, [treeStructure]);

  const getItemStyle = useCallback((id: string): React.CSSProperties => {
    const isSelected = selectedId === id;
    return {
      borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
      backgroundColor: isSelected ? '#f1f1ef' : undefined,
    };
  }, [selectedId]);

  return {
    // State
    isExpanded,
    width: isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
    selectedId,
    expandedFolders,
    isFloatingVisible,
    isDrawerOpen,
    variant: isMobile ? 'drawer' : 'sidebar',
    drawerPosition: 'left',
    transitionDuration: TRANSITION_DURATION,
    transitionTiming: TRANSITION_TIMING,

    // Tree structure
    treeStructure,

    // Actions
    toggle,
    expand,
    collapse,
    selectItem,
    expandFolder,
    collapseFolder,
    toggleFolder,
    isFolderExpanded,
    handleHover,
    openDrawer,
    closeDrawer,
    handleItemClick,
    handleDragEnd,
    navigateNext,
    navigatePrevious,

    // Helpers
    getIndentLevel,
    getItemStyle,
  };
}
