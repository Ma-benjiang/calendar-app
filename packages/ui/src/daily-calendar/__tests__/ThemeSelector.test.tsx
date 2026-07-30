import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeSelector } from '../components/ThemeSelector';

describe('ThemeSelector', () => {
  it('keeps changes as a draft until they are saved', () => {
    const onSave = vi.fn();

    render(
      <ThemeSelector
        currentTheme="vintage"
        strategy="daily-random"
        isOpen
        onSave={onSave}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '随机主题' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '手动选择' })).toBeTruthy();
    expect(screen.queryByText('季节自动')).toBeNull();
    expect(screen.queryByText('AI 推荐')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '手动选择' }));
    fireEvent.click(screen.getByRole('button', { name: '深空磨砂' }));
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));
    expect(onSave).toHaveBeenCalledWith('manual', 'cosmic');
  });
});
