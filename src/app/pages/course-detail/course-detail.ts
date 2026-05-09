import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout';
import { STUDENT_MENU_ITEMS } from '../student/student-menu';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [DashboardLayoutComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail.html'
})
export class CourseDetailComponent {
  menuItems = [...STUDENT_MENU_ITEMS];
}
