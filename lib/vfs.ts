export type FileSystemNodeType = "file" | "directory"

export interface FileSystemNode {
    name: string
    type: FileSystemNodeType
    parent?: FileSystemNode
    children?: { [key: string]: FileSystemNode }
    content?: any
}

export class VirtualFileSystem {
    root: FileSystemNode
    current: FileSystemNode
    home: FileSystemNode

    constructor() {
        this.root = {
            name: "",
            type: "directory",
            children: {},
        }
        // Set root's parent to itself to handle 'cd ..' at root safely
        this.root.parent = this.root

        // Create home directory /home/zachary
        const home = this.createDir("/home/zachary")
        this.home = home
        this.current = home
    }

    // Helper to create a directory path
    createDir(path: string): FileSystemNode {
        const parts = path.split("/").filter(Boolean)
        let node = this.root

        for (const part of parts) {
            if (!node.children) node.children = {}
            if (!node.children[part]) {
                const newNode: FileSystemNode = {
                    name: part,
                    type: "directory",
                    parent: node,
                    children: {},
                }
                node.children[part] = newNode
            }
            node = node.children[part]
        }
        return node
    }

    // Get absolute path of current node
    getPwd(): string {
        if (this.current === this.root) return "/"

        let path = ""
        let node = this.current

        while (node !== this.root) {
            path = "/" + node.name + path
            if (!node.parent) break
            node = node.parent
        }

        return path
    }

    // Resolve path to a node, or null if not found
    resolve(path: string): FileSystemNode | null {
        if (!path) return this.current
        if (path === "~") return this.home
        if (path.startsWith("~/")) {
            path = "/home/zachary" + path.slice(1)
        }

        let startNode = path.startsWith("/") ? this.root : this.current
        const parts = path.split("/").filter(Boolean)

        let node = startNode
        for (const part of parts) {
            if (part === ".") continue
            if (part === "..") {
                node = node.parent || node
                continue
            }

            if (node.type !== "directory" || !node.children || !node.children[part]) {
                return null
            }
            node = node.children[part]
        }
        return node
    }

    // Change directory
    cd(path: string): string | null {
        const node = this.resolve(path)
        if (!node) return `cd: ${path}: No such file or directory`
        if (node.type !== "directory") return `cd: ${path}: Not a directory`

        this.current = node
        return null
    }

    // List contents
    ls(path?: string): string[] {
        const targetNode = path ? this.resolve(path) : this.current
        if (!targetNode) return [`ls: ${path}: No such file or directory`]

        if (targetNode.type === "file") return [targetNode.name]

        if (!targetNode.children) return []
        return Object.keys(targetNode.children).sort()
    }

    // Create a directory
    mkdir(path: string): string | null {
        const parts = path.split("/")
        const newDirName = parts.pop()
        if (!newDirName) return "mkdir: invalid path"

        const parentPath = parts.join("/")
        const parent = parts.length > 0 ? this.resolve(path.startsWith("/") ? parts.join("/") : parentPath) : this.current

        // Handle absolute paths or paths with subdirectories like mkdir foo/bar
        // For simplicity, let's just resolve the parent of the final segment
        // If path is "foo", parent is current. If path is "foo/bar", parent is resolve("foo")

        // Let's reuse resolve logic for the parent
        let targetParent = this.current
        if (path.includes("/")) {
            const lastSlashIndex = path.lastIndexOf("/")
            const parentStr = path.substring(0, lastSlashIndex) || "/"
            const resolved = this.resolve(parentStr)
            if (!resolved) return `mkdir: ${parentStr}: No such file or directory`
            targetParent = resolved
            if (targetParent.type !== "directory") return `mkdir: ${parentStr}: Not a directory`
        }

        if (targetParent.children && targetParent.children[newDirName]) {
            return `mkdir: cannot create directory '${path}': File exists`
        }

        if (!targetParent.children) targetParent.children = {}
        targetParent.children[newDirName] = {
            name: newDirName,
            type: "directory",
            parent: targetParent,
            children: {}
        }
        return null
    }

    // Create a file
    touch(path: string): string | null {
        const parts = path.split("/")
        const newFileName = parts.pop()
        if (!newFileName) return "touch: invalid path"

        let targetParent = this.current
        if (path.includes("/")) {
            const lastSlashIndex = path.lastIndexOf("/")
            const parentStr = path.substring(0, lastSlashIndex) || "/"
            const resolved = this.resolve(parentStr)
            if (!resolved) return `touch: ${parentStr}: No such file or directory`
            targetParent = resolved
            if (targetParent.type !== "directory") return `touch: ${parentStr}: Not a directory`
        }

        // Retrieve existing file to update timestamp? For now just ensure it exists.
        if (targetParent.children && targetParent.children[newFileName]) {
            // "Touching" an existing file updates access time, but we don't track time yet.
            // So do nothing.
            return null
        }

        if (!targetParent.children) targetParent.children = {}
        targetParent.children[newFileName] = {
            name: newFileName,
            type: "file",
            parent: targetParent,
            content: ""
        }
        return null
    }

    // Remove file or directory
    rm(path: string): string | null {
        const node = this.resolve(path)
        if (!node) return `rm: ${path}: No such file or directory`

        if (node === this.root) return "rm: cannot remove root directory"
        if (node === this.current) return "rm: cannot remove current directory" // Simple protection

        const parent = node.parent
        if (!parent || !parent.children) return "rm: cannot remove node (orphan?)"

        delete parent.children[node.name]
        return null
    }

    // Serialize to simple JSON object (removing circular parent refs)
    toJSON(): string {
        const serializeNode = (node: FileSystemNode): any => {
            const obj: any = {
                name: node.name,
                type: node.type
            }
            if (node.content !== undefined) obj.content = node.content
            if (node.children) {
                obj.children = {}
                for (const key in node.children) {
                    obj.children[key] = serializeNode(node.children[key])
                }
            }
            return obj
        }
        return JSON.stringify(serializeNode(this.root))
    }

    // Restore from JSON object
    fromJSON(json: string): void {
        try {
            const data = JSON.parse(json)

            // Recursive restoration of parent links
            const restoreNode = (data: any, parent: FileSystemNode) => {
                const node: FileSystemNode = {
                    name: data.name,
                    type: data.type,
                    parent: parent, // Re-link parent
                    content: data.content
                }
                if (data.children) {
                    node.children = {}
                    for (const key in data.children) {
                        node.children[key] = restoreNode(data.children[key], node)
                    }
                }
                return node
            }

            // Root special handling
            this.root = {
                name: data.name,
                type: data.type,
                children: {},
                // parent set later
            }
            this.root.parent = this.root

            if (data.children) {
                for (const key in data.children) {
                    this.root.children![key] = restoreNode(data.children[key], this.root)
                }
            }

            // Reset current/home pointers after restore
            // Home might need to be re-found
            let home = this.resolve("/home/zachary")
            if (!home) {
                // Should not happen if save data is good, but fallback
                home = this.createDir("/home/zachary")
            }
            this.home = home
            this.current = home

        } catch (e) {
            console.error("Failed to load VFS from JSON", e)
        }
    }
}
