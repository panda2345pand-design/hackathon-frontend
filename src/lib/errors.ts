import { notifications } from '@mantine/notifications'
import { ApiError } from '../api/client'

/** 画面に出すエラー文。API の detail.message を優先する */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return '予期しないエラーが起きました'
}

export function notifyError(error: unknown, title = 'エラー'): void {
  notifications.show({ color: 'red', title, message: errorMessage(error) })
}

export function notifySuccess(message: string, title?: string): void {
  notifications.show({ color: 'nego', title, message })
}
