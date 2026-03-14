unit UnitExample;

interface

uses
  System.SysUtils;

procedure ProcessList(Count: Integer);

implementation

var
  GlobalCounter: Integer; // Global variable usage

procedure ProcessList(Count: Integer);
var
  i: Integer;
  arr: array[0..10] of Integer;
begin
  GlobalCounter := 0;
  
  // Potential Range Check Error if Count > 10
  for i := 0 to Count do
  begin
    arr[i] := i * 10;
    GlobalCounter := GlobalCounter + arr[i];
  end;
  
  Writeln('Result: ' + IntToStr(GlobalCounter));
end;

end.
