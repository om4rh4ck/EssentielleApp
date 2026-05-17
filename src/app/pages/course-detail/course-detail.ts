import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { STUDENT_MENU_ITEMS } from '../student/student-menu';
import { StudentCourse, StudentPortalService } from '../../services/student-portal.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail.html'
})
export class CourseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly portal = inject(StudentPortalService);

  menuItems = [...STUDENT_MENU_ITEMS];
  course = signal<StudentCourse | null>(null);
  objectives = computed(() => this.course()?.objectives ?? []);
  contentItems = computed(() => this.course()?.contentItems ?? []);
  chapters = computed(() => this.course()?.chapters ?? []);
  programModules = computed(() => this.course()?.programModules ?? []);
  galleryImages = computed(() => this.course()?.galleryImages ?? []);
  moduleItems = computed(() => this.course()?.moduleItems ?? []);

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    this.portal.getCatalog().subscribe((courses) => {
      this.course.set(courses.find((item) => item.id === courseId && item.enrolled) ?? null);
    });
  }
}
