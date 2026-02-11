
import React, { useState, useEffect, useCallback } from 'react';
import { Board, AuthUser } from '../types';
import { createBoard, deleteBoard, listBoards } from '../services/boardsApi';

interface DashboardProps {
    user: AuthUser;
    onSelectBoard: (boardId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onSelectBoard }) => {
    const [boards, setBoards] = useState<Board[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    const refreshBoards = useCallback(async () => {
        try {
            const boardsData = await listBoards();
            setBoards(boardsData);
        } catch (err) {
            console.error("Error loading boards:", err);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        refreshBoards();
        const interval = window.setInterval(refreshBoards, 10000);
        return () => window.clearInterval(interval);
    }, [user, refreshBoards]);

    const handleCreateBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        try {
            const board = await createBoard(newTitle.trim());
            setBoards((prev) => [board, ...prev.filter((item) => item.id !== board.id)]);
            setNewTitle("");
            setIsCreating(false);
            onSelectBoard(board.id);
        } catch (err) {
            console.error("Error creating board:", err);
        }
    };

    const handleDeleteBoard = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Delete this board permanently?")) {
            await deleteBoard(id);
            setBoards((prev) => prev.filter((board) => board.id !== id));
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 md:p-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Workspaces</h1>
                    <p className="text-slate-500 font-medium text-lg">Manage your whiteboard strategies and collaborations.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    New Board
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateBoard} className="mb-12 bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-xl animate-in zoom-in-95 duration-300">
                    <h3 className="text-xl font-black text-slate-900 mb-4">Name your new project</h3>
                    <div className="flex gap-4">
                        <input
                            autoFocus
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="e.g. Q3 Growth Strategy"
                            className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 font-medium transition-all"
                        />
                        <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all">Create</button>
                        <button type="button" onClick={() => setIsCreating(false)} className="text-slate-400 font-bold px-4">Cancel</button>
                    </div>
                </form>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.length === 0 ? (
                    <div className="col-span-full border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center space-y-4">
                        <div className="text-5xl">🔭</div>
                        <h3 className="text-2xl font-black text-slate-900">No boards yet</h3>
                        <p className="text-slate-400 font-medium">Create your first board to start digitizing chaos.</p>
                    </div>
                ) : (
                    boards.map(board => {
                        const isOwner = board.owner === user.id;
                        return (
                            <div
                                key={board.id}
                                onClick={() => onSelectBoard(board.id)}
                                className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-2 h-full bg-slate-100 group-hover:bg-indigo-500 transition-colors"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                                        {isOwner ? 'Owner' : 'Shared'}
                                    </div>
                                    {isOwner && (
                                        <button
                                            onClick={(e) => handleDeleteBoard(e, board.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{board.title}</h3>
                                <p className="text-slate-400 text-sm font-medium">
                                    Last updated: {board.updatedAt ? new Date(board.updatedAt).toLocaleDateString() : 'Just now'}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
