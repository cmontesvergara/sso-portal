import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableColumn } from './models/table-column.model';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
    selector: 'app-generic-table',
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, FormsModule, OverlayModule],
    templateUrl: './generic-table.component.html',
    styleUrl: './generic-table.component.scss',
})
export class GenericTableComponent implements OnInit, OnChanges {
    @Input() data: any[] = [];
    @Input() columns: TableColumn[] = [];
    @Input() loading = false;
    @Input() title = '';
    @Input() subtitle = '';
    @Input() headerActions: TemplateRef<any> | null = null;

    // Pagination & Filtering state
    searchTerm = '';
    pageSize = 10;
    currentPage = 1;

    // Computed state
    filteredData: any[] = [];
    paginatedData: any[] = [];
    totalPages = 1;
    totalItems = 0;

    // Page size options
    pageSizeOptions = [5, 10, 20, 30, 50];

    // Action Menu State
    openActionMenuId: any | null = null;

    toggleActionMenu(row: any, event: Event) {
        event.stopPropagation();
        const id = row.id || row.userId || row.appId; // Fallback for ID
        if (this.openActionMenuId === id) {
            this.openActionMenuId = null;
        } else {
            this.openActionMenuId = id;
        }
    }

    closeActionMenu() {
        this.openActionMenuId = null;
    }

    // Helper to check if row has open menu
    isMenuOpen(row: any): boolean {
        const id = row.id || row.userId || row.appId;
        return this.openActionMenuId === id;
    }

    constructor() { }

    ngOnInit() {
        this.updateTable();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['data']) {
            this.updateTable();
        }
    }

    onSearchChange() {
        this.currentPage = 1;
        this.updateTable();
    }

    onPageSizeChange() {
        this.currentPage = 1;
        this.updateTable();
    }

    onPageChange(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePaginatedData();
        }
    }

    get pagesArray(): number[] {
        const pages = [];
        // Logic to show a window of pages could go here, for now just simple all pages or limited window
        // Simple window logic:
        const start = Math.max(1, this.currentPage - 2);
        const end = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }

    private updateTable() {
        if (!this.data) {
            this.filteredData = [];
            this.totalItems = 0;
            this.totalPages = 0;
            this.paginatedData = [];
            return;
        }

        // 1. Filter
        if (this.searchTerm.trim()) {
            const lowerTerm = this.searchTerm.toLowerCase();
            this.filteredData = this.data.filter(row => {
                return this.columns.some(col => {
                    if (!col.field) return false;
                    const val = row[col.field];
                    return val ? String(val).toLowerCase().includes(lowerTerm) : false;
                });
            });
        } else {
            this.filteredData = [...this.data];
        }

        this.totalItems = this.filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);

        // Ensure current page is valid
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }

        // 2. Paginate
        this.updatePaginatedData();
    }

    private updatePaginatedData() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.paginatedData = this.filteredData.slice(startIndex, endIndex);
    }

    get startItemIndex(): number {
        return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    }

    get endItemIndex(): number {
        return Math.min(this.currentPage * this.pageSize, this.totalItems);
    }
}
