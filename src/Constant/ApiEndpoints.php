<?php

namespace App\Constant;

final class ApiEndpoints
{
    //public const BASE_URL = 'https://dungeon-generator.univ-lemans.fr/FrameworkAPI/';
    public const BASE_URL = 'http://localhost:8080/FrameworkAPI/';
    public const LOGIN_TEACHER = "login/teachers/";
    public const GET_TEACHER = "data/teacher/";
    public const EQUIP_URL = "store/learner/";
    public const STATS_URL = "statistics/learner/";
    public const ADD_CLASSROOM = "data/classroom/";
    public const MODIF_CLASSROOM = "data/classroom/";
    public const DELETE_CLASSROOM_1 = "data/teachers/";
    public const DELETE_CLASSROOM_2 = "classroom/";
    public const GET_STUDENTS_1 = "data/students/teachers/";
    public const GET_STUDENTS_2 = "classroom/";
    public const ADD_STUDENT = "data/student";
    public const MODIF_STUDENT = "data/student";
    public const DELETE_STUDENT_1 = "data/teachers/";
    public const DELETE_STUDENT_2 = "classroom/";
    public const DELETE_STUDENT_3 = "learner/";
    public const ADD_PROF = "data/teacher/";
    public const GET_LEARNINGPATH = "path/training/learner/";
    public const GET_LEVEL_1 = "results/learner/";
    public const GET_LEVEL_2 = "objective/";
    public const GET_LEVEL_3 = "level/";
    public const SAVE_LEARNINGPATH = "path/training/";
    public const DELETE_PROF = "data/teachers/";
    public const GET_TEACHERS = "data/teachers/";
}
