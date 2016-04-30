parser grammar HandlebarsParser;

options { language=JavaScript; tokenVocab=HandlebarsLexer; }

document : element* EOF ;

element
    : rawElement
    //| expressionElement
    //| blockElement
    | commentElement
    ;

rawElement  : TEXT;

commentElement : START COMMENT END_COMMENT ;
