NAME=resume

all:
	latexmk -xelatex $(NAME).tex

clean:
	latexmk -c $(NAME).tex

distclean: clean
	rm -f $(NAME).pdf
