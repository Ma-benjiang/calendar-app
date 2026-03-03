/**
 * Drag and Drop Hook
 * Manages drag state, drop targets, and item reordering
 * AC-004: Modular Layout - Drag and Drop
 */
import { useState, useCallback, useMemo } from 'react';

export interface DragItem {
  id: string;
  title: string;
  startTime?: string;
  duration?: number;
  dueDate?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  currentPosition: { x: number; y: number } | null;
}

export interface DropResult {
  eventId: string;
  newStartTime: string;
  newDate: string;
}

export interface ReorderResult {
  activeId: string;
  overId: string;
  newOrder: string[];
}

interface UseDragAndDropOptions {
  items: DragItem[];
  onDrop?: (result: DropResult) => void;
  onReorder?: (result: ReorderResult) => void;
  onTimeChange?: (result: DropResult) => void;
  onDurationChange?: (params: { eventId: string; newDuration: number }) => void;
  validateDrop?: (params: { draggedId: string; targetId: string }) => boolean;
  isMobile?: boolean;
}

interface UseDragAndDropReturn {
  // State
  items: DragItem[];
  dragState: DragState;
  dropTarget: string | null;
  hoveredItem: string | null;
  showDropIndicator: boolean;
  isValidDrop: boolean;
  ariaLiveText: string;

  // Actions
  startDrag: (id: string) => void;
  endDrag: () => void;
  setDropTarget: (id: string | null) => void;
  setHoveredItem: (id: string | null) => void;
  handleEventDrop: (params: DropResult) => void;
  handleResize: (params: { eventId: string; newDuration: number }) => void;
  handleSortEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
  handleLongPress: (id: string) => void;
  handleTouchStart: (params: { id: string; x: number; y: number }) => void;
  handleTouchMove: (params: { x: number; y: number }) => void;
  handleTouchEnd: () => void;
  handleKeyboardDrag: (params: { eventId: string; direction: 'up' | 'down' | 'left' | 'right' }) => void;

  // Helpers
  getItemStyle: (id: string) => React.CSSProperties;
  getDropIndicatorStyle: () => React.CSSProperties;
  showResizeHandle: (id: string) => boolean;
  calculateNewOrder: (params: { activeId: string; overId: string }) => string[];
}

export function useDragAndDrop(options: UseDragAndDropOptions): UseDragAndDropReturn {
  const {
    items,
    onDrop,
    onReorder,
    onTimeChange,
    onDurationChange,
    validateDrop,
    isMobile = false,
  } = options;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedId: null,
    currentPosition: null,
  });
  const [dropTarget, setDropTargetState] = useState<string | null>(null);
  const [hoveredItem, setHoveredItemState] = useState<string | null>(null);
  const [ariaLiveText, setAriaLiveText] = useState('');

  const isValidDrop = useMemo(() => {
    if (!dragState.draggedId || !dropTarget) return true;
    if (dragState.draggedId === dropTarget) return true;
    if (validateDrop) {
      return validateDrop({ draggedId: dragState.draggedId, targetId: dropTarget });
    }
    return true;
  }, [dragState.draggedId, dropTarget, validateDrop]);

  const showDropIndicator = useMemo(() => {
    return dragState.isDragging && dropTarget !== null;
  }, [dragState.isDragging, dropTarget]);

  const startDrag = useCallback((id: string) => {
    setDragState({
      isDragging: true,
      draggedId: id,
      currentPosition: null,
    });
    const item = items.find(i => i.id === id);
    setAriaLiveText(`Dragging ${item?.title || 'item'}`);
  }, [items]);

  const endDrag = useCallback(() => {
    if (dragState.draggedId && dropTarget && dragState.draggedId !== dropTarget) {
      onDrop?.({
        eventId: dragState.draggedId,
        newStartTime: new Date().toISOString(),
        newDate: new Date().toISOString().split('T')[0],
      });
    }
    setDragState({
      isDragging: false,
      draggedId: null,
      currentPosition: null,
    });
    setDropTargetState(null);
    setAriaLiveText('Drop completed');
  }, [dragState.draggedId, dropTarget, onDrop]);

  const setDropTarget = useCallback((id: string | null) => {
    setDropTargetState(id);
  }, []);

  const setHoveredItem = useCallback((id: string | null) => {
    setHoveredItemState(id);
  }, []);

  const handleEventDrop = useCallback((params: DropResult) => {
    onTimeChange?.(params);
  }, [onTimeChange]);

  const handleResize = useCallback((params: { eventId: string; newDuration: number }) => {
    onDurationChange?.(params);
  }, [onDurationChange]);

  const handleSortEnd = useCallback((event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const newOrder = calculateNewOrder({ activeId: active.id, overId: over.id });
    onReorder?.({
      activeId: active.id,
      overId: over.id,
      newOrder,
    });
  }, [onReorder, calculateNewOrder]);

  const handleLongPress = useCallback((id: string) => {
    if (isMobile) {
      startDrag(id);
    }
  }, [isMobile, startDrag]);

  const handleTouchStart = useCallback((params: { id: string; x: number; y: number }) => {
    if (isMobile) {
      setDragState(prev => ({
        ...prev,
        draggedId: params.id,
        currentPosition: { x: params.x, y: params.y },
      }));
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((params: { x: number; y: number }) => {
    if (isMobile && dragState.isDragging) {
      setDragState(prev => ({
        ...prev,
        currentPosition: { x: params.x, y: params.y },
      }));
    }
  }, [isMobile, dragState.isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (isMobile) {
      endDrag();
    }
  }, [isMobile, endDrag]);

  const handleKeyboardDrag = useCallback((params: { eventId: string; direction: 'up' | 'down' | 'left' | 'right' }) => {
    setDragState({
      isDragging: true,
      draggedId: params.eventId,
      currentPosition: null,
    });
    setAriaLiveText(`Dragging item ${params.direction}`);
  }, []);

  const calculateNewOrder = useCallback(({ activeId, overId }: { activeId: string; overId: string }): string[] => {
    const oldIndex = items.findIndex(item => item.id === activeId);
    const newIndex = items.findIndex(item => item.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      return items.map(item => item.id);
    }

    const newOrder = items.map(item => item.id);
    const [movedId] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedId);

    return newOrder;
  }, [items]);

  const getItemStyle = useCallback((id: string): React.CSSProperties => {
    const isDragged = dragState.draggedId === id;
    return {
      opacity: isDragged ? 0.5 : 1,
      boxShadow: isDragged ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
      transform: isDragged ? 'scale(1.02)' : undefined,
      transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
    };
  }, [dragState.draggedId]);

  const getDropIndicatorStyle = useCallback((): React.CSSProperties => {
    return {
      borderColor: isValidDrop ? '#3b82f6' : '#ef4444',
      borderWidth: '2px',
      borderStyle: 'dashed',
    };
  }, [isValidDrop]);

  const showResizeHandle = useCallback((id: string): boolean => {
    return hoveredItem === id;
  }, [hoveredItem]);

  return {
    // State
    items,
    dragState,
    dropTarget,
    hoveredItem,
    showDropIndicator,
    isValidDrop,
    ariaLiveText,

    // Actions
    startDrag,
    endDrag,
    setDropTarget,
    setHoveredItem,
    handleEventDrop,
    handleResize,
    handleSortEnd,
    handleLongPress,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyboardDrag,

    // Helpers
    getItemStyle,
    getDropIndicatorStyle,
    showResizeHandle,
    calculateNewOrder,
  };
}
