import { useEffect, useState } from "react"
import { fetchBlogList, fetchBlogArticle, type BlogArticleMeta, type BlogArticle } from "@/lib/api"

interface BlogListState {
    articles: BlogArticleMeta[]
    loading: boolean
    error: string | null
}

export function useBlogList() {
    const [state, setState] = useState<BlogListState>({ articles: [], loading: true, error: null })

    useEffect(() => {
        let alive = true
        fetchBlogList()
            .then((r) => alive && setState({ articles: r.articles, loading: false, error: null }))
            .catch((e: Error) => alive && setState({ articles: [], loading: false, error: e.message }))
        return () => { alive = false }
    }, [])

    return state
}

interface BlogArticleState {
    article: BlogArticle | null
    loading: boolean
    notFound: boolean
    error: string | null
}

export function useBlogArticle(slug: string) {
    const [state, setState] = useState<BlogArticleState>({ article: null, loading: true, notFound: false, error: null })

    useEffect(() => {
        let alive = true
        fetchBlogArticle(slug)
            .then((r) => alive && setState({ article: r.article, loading: false, notFound: false, error: null }))
            .catch((e: Error) => {
                if (!alive) return
                setState({
                    article: null,
                    loading: false,
                    notFound: e.message.includes("404"),
                    error: e.message,
                })
            })
        return () => { alive = false }
    }, [slug])

    return state
}