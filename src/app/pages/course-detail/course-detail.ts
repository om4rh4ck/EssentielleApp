import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { STUDENT_MENU_ITEMS } from '../student/student-menu';
import { PublicCatalogCourse, PublicCatalogService } from '../../services/public-catalog.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail.html'
})
export class CourseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(PublicCatalogService);

  menuItems = [...STUDENT_MENU_ITEMS];
  course = signal<PublicCatalogCourse | null>(null);
  objectives = computed(() => this.course()?.objectives ?? []);
  contentItems = computed(() => this.course()?.contentItems ?? []);
  chapters = computed(() => this.course()?.chapters ?? []);

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    this.catalog.getCatalog().subscribe((response) => {
      this.course.set(response.courses.find((item) => item.id === courseId) ?? null);
    });
  }
}
