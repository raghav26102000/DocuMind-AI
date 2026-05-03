import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from jinja2 import Environment, FileSystemLoader
import shutil


def latex_escape(text: str) -> str:
    """
    Escape LaTeX special characters in a string.
    """
    if text is None:
        return "Not provided"
    text = str(text).strip()
    replacements = {
        '&': '\\&',
        '%': '\\%',
        '$': '\\$',
        '#': '\\#',
        '_': '\\_',
        '{': '\\{',
        '}': '\\}',
        '~': '\\textasciitilde{}',
        '^': '\\textasciicircum{}',
        '\\': '\\textbackslash{}',
        '₹': '\\textcurrency{}',
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    return text


# def convert_legacy_placeholders_to_jinja(template: str) -> str:
#     """
#     Convert legacy {0}, {1}, ... placeholders to Jinja2 syntax: {{ answers[0] }}, etc.
#     This allows backward compatibility with old templates.
#     """
#     # Replace {0}, {1}, ... {999} with {{ answers[0] }}, {{ answers[1] }}, etc.
#     def replacer(match):
#         index = match.group(1)
#         return f"{{{{ answers[{index}] }}}}"
#
#     return re.sub(r"\{(\d+)\}", replacer, template)
#

class DPRGenerator:
    """
    A robust DPR generator using Jinja2 templating for LaTeX.
    Avoids all brace collision issues and supports conditionals, loops, etc.
    """

    def __init__(self, json_data: Dict, template_dir: Path):

        print("parsing input dict to init")
        self.questions_data = json_data.get('questions', [])
        print("parsing done")

        self.template_dir= template_dir
        self.latex_file_path= None


        # --- not needed when its already jinja compatible ---
        # Convert literal \n to real newlines
        # raw_latex = raw_latex.replace('\\n', '\n')
        # Convert {0}, {1}... to {{ answers[0] }}, {{ answers[1] }}...
        # self.latex_template_str = convert_legacy_placeholders_to_jinja(raw_latex)

        self.answers = {}

    def collect_answers_from_cli(self) -> None:
        """Example of collecting answers interactively."""
        print("Please provide the following details:")
        for item in self.questions_data:
            key = item['key']
            question = item['question']
            answer = input(f"- {question}: ")
            self.answers[key] = answer if answer else "Not provided"


    def collect_answers(self, answers: Dict) -> None:
        if len(answers) != len(self.questions_data):
            raise ValueError(f"Number of answers ({len(answers)}) must match number of questions ({len(self.questions_data)})")
        self.answers = answers


    def render_latex(self, answers: Dict) -> str:
        if not answers:
            raise ValueError("No answers provided. Call collect_answers() first.")

        # Escape all answers for LaTeX
        escaped_answers = {key: latex_escape(value) for key, value in answers.items()}

        # print("escaped answers are: ", escaped_answers)

        # env = Environment(loader=BaseLoader(), autoescape=False)
        # template = env.from_string(self.latex_template_str)

        env = Environment(loader=FileSystemLoader(self.template_dir), trim_blocks= True, lstrip_blocks= True)
        env.filters['latex_escape'] = latex_escape

        print("env is: ", env)
        template = env.get_template("dpr.tex.jinja")
        print("template from env.get_template() on the original template: ", template)

        latex_content = template.render(answers=escaped_answers)
        return latex_content



    def validate_latex(self, latex_content: str) -> Tuple[bool, List[str]]:
        issues = []

        if '\\documentclass' not in latex_content:
            issues.append("Missing \\documentclass declaration")
        if '\\begin{document}' not in latex_content:
            issues.append("Missing \\begin{document}")
        if '\\end{document}' not in latex_content:
            issues.append("Missing \\end{document}")

        open_braces = latex_content.count('{')
        close_braces = latex_content.count('}')
        if open_braces != close_braces:
            issues.append(f"Unbalanced braces: {open_braces} opening, {close_braces} closing")

        return len(issues) == 0, issues

    @classmethod
    def compile_to_pdf(cls, latex_file_path: Path, output_pdf_name: Optional[str] = None) -> str:
        """
        takes latex file from given path, makes the pdf, log, and aux in a temp dir,
        then copies the pdf file to the same path as latex file, with the given name
        """
        with tempfile.TemporaryDirectory() as temp_dir:

            pdf_file = Path(temp_dir) / (latex_file_path.stem + ".pdf")
            for _ in range(2):  # Run twice for references
                try:
                    result = subprocess.run([
                        'pdflatex',
                        '-interaction=nonstopmode',
                        '-output-directory', temp_dir,
                        str(latex_file_path.resolve())
                    ], capture_output=True, text=True, timeout=60)

                    # if result.returncode != 0:
                    #     raise RuntimeError(f"pdflatex failed:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}")
                    if not pdf_file.exists():
                        raise RuntimeError("PDF was not generated.")
                    else:
                        break

                except subprocess.TimeoutExpired:
                    raise RuntimeError("pdflatex compilation timed out")
                except FileNotFoundError:
                    raise RuntimeError("pdflatex not found. Install TeX Live or MiKTeX.")


            print("debug pdf made")
            output_path = latex_file_path.parent / (output_pdf_name or "dpr.pdf")
            shutil.copy(pdf_file, output_path)
            print("moved to", str(output_path.resolve()))

            return str(output_path.resolve())

    def generate_pdf(self, answers: Dict, output_path: Optional[str] = None) -> str:
        self.collect_answers(answers)
        if not self.latex_file_path:
            latex_content = self.render_latex(answers)

            is_valid, issues = self.validate_latex(latex_content)
            if not is_valid:
                print("⚠️  LaTeX Validation Issues:")
                for issue in issues:
                    print(f"  - {issue}")
            (self.template_dir / (output_path or "debug.tex")).write_text(latex_content)

        if self.latex_file_path:
            pdf_path = self.compile_to_pdf(self.latex_file_path, output_path)
            return pdf_path
        else:
            return "latex file path not initialized properly, probably memory issue"

    def save_latex_file(self, answers: Dict, output_filename: str = 'document.tex') -> str:
        self.collect_answers(answers)
        latex_content = self.render_latex(answers)
        print("rendered: ", latex_content)
        output_path= self.template_dir / output_filename
        self.latex_file_path= output_path
        output_path.write_text(latex_content, encoding='utf-8')
        return str(output_path.resolve())
