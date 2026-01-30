import React from 'react';
import { TaskRFI } from './TaskRFI';
import { TaskSI } from './TaskSI';
import { TaskVO } from './TaskVO';
import { TaskDC } from './TaskDC';
import { TaskCPI } from './TaskCPI';
import { TaskGI } from './TaskGI';

interface TaskContentRendererProps {
  displayTask: any;
}

export const TaskContentRenderer: React.FC<TaskContentRendererProps> = ({ displayTask }) => {
  if (!displayTask || !displayTask.formFields) return null;

  switch (displayTask.type) {
    case 'RFI':
      return <TaskRFI formFields={displayTask.formFields} />;
    case 'SI':
      return <TaskSI formFields={displayTask.formFields} />;
    case 'VO':
      return <TaskVO formFields={displayTask.formFields} />;
    case 'DC':
      return <TaskDC formFields={displayTask.formFields} />;
    case 'CPI':
      return <TaskCPI formFields={displayTask.formFields} />;
    case 'GI':
      return <TaskGI formFields={displayTask.formFields} />;
    default:
      return null;
  }
};
