export function getThumbnailUrl(url?: string) {
  if (!url) return ''

  return url.replace(
    '/upload/',
    '/upload/w_300,h_300,c_fill,q_auto,f_auto/'
  )
}